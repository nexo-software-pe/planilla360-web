import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  exhaustMap,
  forkJoin,
  of,
  pipe,
  switchMap,
  takeWhile,
  tap,
  timer,
} from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { NotificacionService } from '../../core/http/notificacion.service';
import {
  EstadoGeneracion,
  LineaPlanilla,
  Planilla,
  PlanillaService,
  Validacion,
} from './planilla.service';

export type AccionPlanilla = 'calcular' | 'cerrar' | 'anular' | 'pago' | 'boletas';

interface PlanillaState {
  planilla: Planilla | null;
  lineas: LineaPlanilla[];
  validacion: Validacion | null;
  boletas: EstadoGeneracion | null;
  cargando: boolean;
  accion: AccionPlanilla | null;
  error: string | null;
  /** Clave del cierre en curso: se conserva si falla para que el reintento sea idempotente. */
  claveCierre: string | null;
}

const ESTADO_INICIAL: PlanillaState = {
  planilla: null,
  lineas: [],
  validacion: null,
  boletas: null,
  cargando: false,
  accion: null,
  error: null,
  claveCierre: null,
};

const INTERVALO_SONDEO_MS = 3000;

const mensaje = (e: unknown): string =>
  e instanceof ApiError ? e.mensaje : 'No se pudo completar la operación.';

/**
 * Estado de una planilla: crear → calcular → ver líneas y totales → validaciones → cerrar →
 * generación de boletas. Se provee por pantalla (`providers: [PlanillaStore]`).
 */
export const PlanillaStore = signalStore(
  withState(ESTADO_INICIAL),

  withComputed((store) => ({
    incidencias: computed(() => store.validacion()?.incidencias ?? []),
    ocupado: computed(() => store.cargando() || store.accion() !== null),
    esCerrada: computed(() => store.planilla()?.estado === 'CERRADA'),
    boletasEnCurso: computed(() => (store.boletas()?.pendientes ?? 0) > 0),
  })),

  withComputed((store) => ({
    puedeCalcular: computed(() => {
      const estado = store.planilla()?.estado;
      return (estado === 'BORRADOR' || estado === 'CALCULADA') && !store.ocupado();
    }),
    /** "Cerrar" exige planilla calculada y ninguna validación pendiente. */
    puedeCerrar: computed(
      () =>
        store.planilla()?.estado === 'CALCULADA' &&
        store.validacion() !== null &&
        store.incidencias().length === 0 &&
        !store.ocupado(),
    ),
    puedeAnular: computed(() => store.esCerrada() && !store.ocupado()),
    puedePagar: computed(() => store.esCerrada() && !store.ocupado()),
    puedeGenerarBoletas: computed(
      () => store.esCerrada() && !store.ocupado() && !store.boletasEnCurso(),
    ),
  })),

  withMethods((store, servicio = inject(PlanillaService), avisos = inject(NotificacionService)) => {
    const fallo = (e: unknown) =>
      patchState(store, { error: mensaje(e), accion: null, cargando: false });

    const recargarResultados = (id: string) =>
      forkJoin({
        lineas: servicio.lineas(id),
        validacion: servicio.validaciones(id),
      }).pipe(tap((r) => patchState(store, r)));

    const sondear = rxMethod<string>(
      pipe(
        switchMap((id) =>
          timer(0, INTERVALO_SONDEO_MS).pipe(
            exhaustMap(() => servicio.estadoBoletas(id).pipe(catchError(() => EMPTY))),
            tap((boletas) => patchState(store, { boletas })),
            // sigue preguntando mientras queden boletas pendientes; la última respuesta sí se emite
            takeWhile((boletas) => boletas.pendientes > 0, true),
          ),
        ),
      ),
    );

    const cargar = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { ...ESTADO_INICIAL, cargando: true })),
        switchMap((id) =>
          servicio.obtener(id).pipe(
            tap((planilla) => patchState(store, { planilla })),
            switchMap((planilla) => {
              if (planilla.estado === 'BORRADOR') return of(null);
              const resultados$ = recargarResultados(id);
              if (planilla.estado !== 'CERRADA') return resultados$;
              return forkJoin([resultados$, servicio.estadoBoletas(id)]).pipe(
                tap(([, boletas]) => patchState(store, { boletas })),
              );
            }),
            tap(() => {
              patchState(store, { cargando: false });
              if (store.boletasEnCurso()) sondear(id);
            }),
            catchError((e: unknown) => {
              fallo(e);
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    /** Ejecuta una acción sobre la planilla actual, marcándola en curso mientras dura. */
    const ejecutar = <T>(
      accion: AccionPlanilla,
      peticion: (id: string) => Observable<T>,
      alExito: (resultado: T, id: string) => void,
    ) => {
      const id = store.planilla()?.id;
      if (!id || store.accion() !== null) return;
      patchState(store, { accion, error: null });
      peticion(id).subscribe({
        next: (r) => {
          patchState(store, { accion: null });
          alExito(r, id);
        },
        error: fallo,
      });
    };

    return {
      cargar,

      calcular(): void {
        ejecutar(
          'calcular',
          (id) => servicio.calcular(id),
          (planilla, id) => {
            patchState(store, { planilla });
            avisos.exito('Planilla calculada.');
            recargarResultados(id).subscribe({ error: fallo });
          },
        );
      },

      cerrar(): void {
        if (!store.puedeCerrar()) return;
        const clave = store.claveCierre() ?? crypto.randomUUID();
        patchState(store, { claveCierre: clave });
        ejecutar(
          'cerrar',
          (id) => servicio.cerrar(id, clave),
          (planilla, id) => {
            patchState(store, { planilla, claveCierre: null });
            avisos.exito('Planilla cerrada. Ya puedes generar las boletas.');
            forkJoin([recargarResultados(id), servicio.estadoBoletas(id)]).subscribe({
              next: ([, boletas]) => {
                patchState(store, { boletas });
                // al cerrar, la API dispara la generación de boletas: se sigue su avance
                if (boletas.pendientes > 0) sondear(id);
              },
              error: fallo,
            });
          },
        );
      },

      anular(motivo: string): void {
        ejecutar(
          'anular',
          (id) => servicio.anular(id, motivo),
          (planilla) => {
            patchState(store, { planilla });
            avisos.exito('Planilla anulada.');
          },
        );
      },

      registrarPago(fechaPago: string, referencia: string): void {
        ejecutar(
          'pago',
          (id) => servicio.registrarPago(id, fechaPago, referencia),
          () => avisos.exito('Pago registrado.'),
        );
      },

      generarBoletas(): void {
        ejecutar(
          'boletas',
          (id) => servicio.generarBoletas(id),
          (boletas, id) => {
            patchState(store, { boletas });
            avisos.info('Generando boletas. Puedes seguir el avance aquí.');
            sondear(id);
          },
        );
      },
    };
  }),
);
