import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EstadoGeneracion, Planilla, PlanillaService, Validacion } from './planilla.service';
import { PlanillaStore } from './planilla.store';

const planilla = (estado: Planilla['estado']): Planilla => ({
  id: 'p1',
  periodo: '2026-11',
  tipo: 'MENSUAL',
  estado,
  trabajadores: 10,
  totalIngresos: 1000,
  totalDescuentos: 100,
  totalNeto: 900,
  totalEssalud: 90,
  cerradaEn: null,
});

const sinValidaciones: Validacion = { valida: true, incidencias: [] };
const conValidaciones: Validacion = {
  valida: false,
  incidencias: [{ codigo: 'SIN_ASISTENCIA', mensaje: 'Falta consolidar la asistencia.' }],
};
const boletasListas: EstadoGeneracion = {
  planillaId: 'p1',
  estado: 'COMPLETADA',
  total: 10,
  pendientes: 0,
  generadas: 2,
  enviadas: 8,
  fallidas: 0,
};

function crear(estado: Planilla['estado'], validacion: Validacion) {
  const servicio = {
    obtener: vi.fn(() => of(planilla(estado))),
    lineas: vi.fn(() => of([])),
    validaciones: vi.fn(() => of(validacion)),
    estadoBoletas: vi.fn(() => of(boletasListas)),
    calcular: vi.fn(() => of(planilla('CALCULADA'))),
    cerrar: vi.fn<(id: string, clave: string) => Observable<Planilla>>(() =>
      of(planilla('CERRADA')),
    ),
    generarBoletas: vi.fn(),
    anular: vi.fn(),
    registrarPago: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      PlanillaStore,
      { provide: PlanillaService, useValue: servicio },
      { provide: NotificacionService, useValue: { exito: vi.fn(), info: vi.fn(), error: vi.fn() } },
    ],
  });
  const store = TestBed.inject(PlanillaStore);
  store.cargar('p1');
  return { store, servicio };
}

describe('PlanillaStore', () => {
  it('en borrador solo trae la planilla: aún no hay líneas ni validaciones que pedir', () => {
    const { store, servicio } = crear('BORRADOR', sinValidaciones);
    expect(store.planilla()?.estado).toBe('BORRADOR');
    expect(servicio.lineas).not.toHaveBeenCalled();
    expect(servicio.validaciones).not.toHaveBeenCalled();
    expect(store.puedeCalcular()).toBe(true);
    expect(store.puedeCerrar()).toBe(false);
  });

  it('"Cerrar" queda deshabilitado mientras existan validaciones pendientes', () => {
    const { store, servicio } = crear('CALCULADA', conValidaciones);
    expect(store.incidencias()).toHaveLength(1);
    expect(store.puedeCerrar()).toBe(false);

    store.cerrar();
    expect(servicio.cerrar).not.toHaveBeenCalled();
  });

  it('con la planilla calculada y sin validaciones se puede cerrar', () => {
    const { store } = crear('CALCULADA', sinValidaciones);
    expect(store.puedeCerrar()).toBe(true);
  });

  it('cerrar envía una Idempotency-Key y, al terminar, la planilla queda cerrada', () => {
    const { store, servicio } = crear('CALCULADA', sinValidaciones);
    store.cerrar();

    expect(servicio.cerrar).toHaveBeenCalledTimes(1);
    expect(servicio.cerrar.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.planilla()?.estado).toBe('CERRADA');
    expect(store.claveCierre()).toBeNull();
    expect(store.boletas()?.total).toBe(10);
    expect(store.puedeCerrar()).toBe(false);
  });

  it('si el cierre falla, el reintento reutiliza la misma clave (no cierra dos veces)', () => {
    const { store, servicio } = crear('CALCULADA', sinValidaciones);
    servicio.cerrar.mockReturnValueOnce(
      throwError(() => new ApiError(503, 'No disponible', 'Inténtalo más tarde.')),
    );

    store.cerrar();
    expect(store.error()).toBe('Inténtalo más tarde.');
    expect(store.accion()).toBeNull();
    const primera = servicio.cerrar.mock.calls[0][1];

    store.cerrar();
    expect(servicio.cerrar.mock.calls[1][1]).toBe(primera);
    expect(store.planilla()?.estado).toBe('CERRADA');
  });

  it('una planilla cerrada permite generar boletas y anular, pero no recalcular', () => {
    const { store } = crear('CERRADA', sinValidaciones);
    expect(store.puedeGenerarBoletas()).toBe(true);
    expect(store.puedeAnular()).toBe(true);
    expect(store.puedeCalcular()).toBe(false);
  });

  it('no deja generar boletas mientras haya pendientes', () => {
    const { store, servicio } = crear('CERRADA', sinValidaciones);
    servicio.estadoBoletas.mockReturnValue(of({ ...boletasListas, pendientes: 4 }));
    store.cargar('p1');
    expect(store.boletasEnCurso()).toBe(true);
    expect(store.puedeGenerarBoletas()).toBe(false);
  });
});
