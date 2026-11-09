import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Observable, forkJoin, map } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_PERMISO, ESTADO_SOLICITUD_VACACIONES, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { EmpleadosService, indexarPorId } from '../empleados/empleados.service';
import {
  Permiso,
  SolicitudVacaciones,
  TIPO_PERMISO,
  VacacionesService,
} from './vacaciones.service';

/** Solicitudes de vacaciones y permisos que esperan una decisión. */
@Component({
  selector: 'app-bandeja',
  imports: [MatButtonModule, EstadoLista, Etiqueta, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (datos.datos(); as d) {
      <div class="pila">
        <section>
          <h2>Vacaciones por aprobar</h2>
          <div class="tabla-caja">
            @if (d.solicitudes.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Empleado</th>
                    <th scope="col">Desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col" class="cifra">Días</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span class="solo-lector">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of d.solicitudes; track s.id) {
                    <tr>
                      <td>{{ nombre(s.empleadoId) }}</td>
                      <td>{{ s.desde | fecha }}</td>
                      <td>{{ s.hasta | fecha }}</td>
                      <td class="cifra">{{ s.dias }}</td>
                      <td>
                        <app-etiqueta
                          [texto]="visualSolicitud(s).texto"
                          [tono]="visualSolicitud(s).tono"
                        />
                      </td>
                      <td>
                        <div class="acciones-fila">
                          @if (s.estado === 'APROBADA_JEFE') {
                            <button
                              mat-flat-button
                              type="button"
                              [disabled]="ocupado()"
                              (click)="aprobarRrhh(s)"
                              [attr.aria-label]="'Dar aprobación final a ' + nombre(s.empleadoId)"
                            >
                              Aprobar
                            </button>
                          } @else if (sinJefe(s.empleadoId)) {
                            <button
                              mat-flat-button
                              type="button"
                              [disabled]="ocupado()"
                              (click)="aprobarComoJefe(s)"
                              [attr.aria-label]="'Aprobar como jefe a ' + nombre(s.empleadoId)"
                            >
                              Aprobar como jefe
                            </button>
                          } @else {
                            <span class="espera">Espera al jefe directo</span>
                          }
                          <button
                            mat-stroked-button
                            type="button"
                            [disabled]="ocupado()"
                            (click)="rechazarSolicitud(s)"
                            [attr.aria-label]="'Rechazar vacaciones de ' + nombre(s.empleadoId)"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">No hay solicitudes de vacaciones pendientes.</p>
            }
          </div>
        </section>

        <section>
          <h2>Permisos por aprobar</h2>
          <div class="tabla-caja">
            @if (d.permisos.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Empleado</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col" class="cifra">Días</th>
                    <th scope="col">Goce</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span class="solo-lector">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of d.permisos; track p.id) {
                    <tr>
                      <td>{{ nombre(p.empleadoId) }}</td>
                      <td>{{ tipoPermiso(p) }}</td>
                      <td>{{ p.desde | fecha }}</td>
                      <td>{{ p.hasta | fecha }}</td>
                      <td class="cifra">{{ p.dias }}</td>
                      <td>{{ p.conGoce ? 'Con goce' : 'Sin goce' }}</td>
                      <td>
                        <app-etiqueta
                          [texto]="visualPermiso(p).texto"
                          [tono]="visualPermiso(p).tono"
                        />
                      </td>
                      <td>
                        <div class="acciones-fila">
                          <button
                            mat-flat-button
                            type="button"
                            [disabled]="ocupado()"
                            (click)="aprobarPermiso(p)"
                            [attr.aria-label]="'Aprobar permiso de ' + nombre(p.empleadoId)"
                          >
                            Aprobar
                          </button>
                          <button
                            mat-stroked-button
                            type="button"
                            [disabled]="ocupado()"
                            (click)="rechazarPermiso(p)"
                            [attr.aria-label]="'Rechazar permiso de ' + nombre(p.empleadoId)"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">No hay permisos pendientes.</p>
            }
          </div>
        </section>
      </div>
    }
    <app-estado-lista
      [cargando]="datos.cargando() && !datos.datos()"
      [error]="datos.error()"
      (reintentar)="datos.cargar()"
    />
  `,
  styles: `
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .vacio {
      margin: 0;
      padding: 24px 16px;
      text-align: center;
      color: var(--color-texto-secundario);
    }
    .espera {
      align-self: center;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
  `,
})
export class Bandeja {
  private readonly servicio = inject(VacacionesService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });
  private readonly indice = computed(() => indexarPorId(this.empleados()));

  protected readonly ocupado = signal(false);

  protected readonly datos = recurso(() =>
    forkJoin({
      // las que ya pasaron el filtro del jefe esperan a RRHH; las nuevas, al jefe
      solicitudes: forkJoin([
        this.servicio.solicitudes('APROBADA_JEFE'),
        this.servicio.solicitudes('SOLICITADA'),
      ]).pipe(map(([aprobadasPorJefe, nuevas]) => [...aprobadasPorJefe, ...nuevas])),
      permisos: this.servicio.permisos('SOLICITADO'),
    }),
  );

  constructor() {
    this.datos.cargar();
  }

  protected nombre(id: string): string {
    const e = this.indice().get(id);
    return e ? `${e.apellidos}, ${e.nombres}` : 'Empleado';
  }

  protected sinJefe(id: string): boolean {
    const e = this.indice().get(id);
    return !!e && e.jefeId === null;
  }

  protected tipoPermiso(p: Permiso): string {
    return TIPO_PERMISO[p.tipo];
  }

  protected visualSolicitud(s: SolicitudVacaciones) {
    return estadoVisual(ESTADO_SOLICITUD_VACACIONES, s.estado);
  }

  protected visualPermiso(p: Permiso) {
    return estadoVisual(ESTADO_PERMISO, p.estado);
  }

  protected aprobarRrhh(s: SolicitudVacaciones): void {
    this.ejecutar(this.servicio.aprobarRrhh(s.id), 'Vacaciones aprobadas.');
  }

  protected aprobarComoJefe(s: SolicitudVacaciones): void {
    this.ejecutar(
      this.servicio.aprobarJefe(s.id),
      'Aprobada en nombre del jefe. Falta la aprobación de RRHH.',
    );
  }

  protected rechazarSolicitud(s: SolicitudVacaciones): void {
    this.dialogos
      .pedirTexto({
        titulo: `Rechazar vacaciones de ${this.nombre(s.empleadoId)}`,
        etiqueta: 'Motivo del rechazo',
        accion: 'Rechazar',
      })
      .subscribe((motivo) =>
        this.ejecutar(this.servicio.rechazar(s.id, motivo), 'Solicitud rechazada.'),
      );
  }

  protected aprobarPermiso(p: Permiso): void {
    this.ejecutar(this.servicio.aprobarPermiso(p.id), 'Permiso aprobado.');
  }

  protected rechazarPermiso(p: Permiso): void {
    this.dialogos
      .pedirTexto({
        titulo: `Rechazar permiso de ${this.nombre(p.empleadoId)}`,
        etiqueta: 'Motivo del rechazo',
        accion: 'Rechazar',
      })
      .subscribe((motivo) =>
        this.ejecutar(this.servicio.rechazarPermiso(p.id, motivo), 'Permiso rechazado.'),
      );
  }

  private ejecutar(peticion: Observable<unknown>, mensaje: string): void {
    this.ocupado.set(true);
    peticion.subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisos.exito(mensaje);
        this.datos.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }
}
