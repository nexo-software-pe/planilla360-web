import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_HORA_EXTRA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { EmpleadosService, indexarPorId } from '../empleados/empleados.service';
import { EstadoHoraExtra, HoraExtra, AsistenciaService } from './asistencia.service';

@Component({
  selector: 'app-horas-extra',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule, EstadoLista, Etiqueta, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filtro">
      <mat-label>Estado</mat-label>
      <mat-select [value]="estado()" (valueChange)="filtrar($event)">
        <mat-option value="">Todas</mat-option>
        <mat-option value="PENDIENTE">Pendientes</mat-option>
        <mat-option value="APROBADA">Aprobadas</mat-option>
        <mat-option value="RECHAZADA">Rechazadas</mat-option>
      </mat-select>
    </mat-form-field>

    <section class="tabla-caja" aria-label="Solicitudes de horas extra">
      @if (lista.datos(); as filas) {
        @if (filas.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col">Fecha</th>
                <th scope="col" class="cifra">Horas</th>
                <th scope="col">Motivo</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (h of filas; track h.id) {
                <tr>
                  <td>{{ nombre(h) }}</td>
                  <td>{{ h.fecha | fecha }}</td>
                  <td class="cifra">{{ h.horas }}</td>
                  <td>{{ h.motivo || '—' }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(h).texto" [tono]="visual(h).tono" />
                  </td>
                  <td>
                    @if (h.estado === 'PENDIENTE') {
                      <div class="acciones-fila">
                        <button
                          mat-flat-button
                          type="button"
                          [disabled]="resolviendo()"
                          (click)="aprobar(h)"
                          [attr.aria-label]="'Aprobar horas extra de ' + nombre(h)"
                        >
                          Aprobar
                        </button>
                        <button
                          mat-stroked-button
                          type="button"
                          [disabled]="resolviendo()"
                          (click)="rechazar(h)"
                          [attr.aria-label]="'Rechazar horas extra de ' + nombre(h)"
                        >
                          Rechazar
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
      <app-estado-lista
        [cargando]="lista.cargando() && !lista.datos()"
        [error]="lista.error()"
        [vacio]="lista.datos()?.length === 0"
        mensajeVacio="No hay solicitudes de horas extra con este estado."
        (reintentar)="lista.cargar()"
      />
    </section>
  `,
  styles: `
    .filtro {
      min-width: 220px;
      margin-bottom: 16px;
    }
  `,
})
export class HorasExtra {
  private readonly servicio = inject(AsistenciaService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });
  private readonly indice = computed(() => indexarPorId(this.empleados()));

  protected readonly estado = signal<EstadoHoraExtra | ''>('PENDIENTE');
  protected readonly resolviendo = signal(false);
  protected readonly lista = recurso(() => this.servicio.horasExtra(this.estado() || undefined));

  constructor() {
    this.lista.cargar();
  }

  protected filtrar(estado: EstadoHoraExtra | ''): void {
    this.estado.set(estado);
    this.lista.cargar();
  }

  protected nombre(h: HoraExtra): string {
    const e = this.indice().get(h.empleadoId);
    return e ? `${e.apellidos}, ${e.nombres}` : 'Empleado';
  }

  protected visual(h: HoraExtra) {
    return estadoVisual(ESTADO_HORA_EXTRA, h.estado);
  }

  protected aprobar(h: HoraExtra): void {
    this.resolver(h, 'APROBAR', 'Horas extra aprobadas.');
  }

  protected rechazar(h: HoraExtra): void {
    this.dialogos
      .confirmar({
        titulo: 'Rechazar horas extra',
        mensaje: `Se rechazarán ${h.horas} h de ${this.nombre(h)} y no se pagarán en la planilla.`,
        accion: 'Rechazar',
      })
      .subscribe(() => this.resolver(h, 'RECHAZAR', 'Horas extra rechazadas.'));
  }

  private resolver(h: HoraExtra, accion: 'APROBAR' | 'RECHAZAR', mensaje: string): void {
    this.resolviendo.set(true);
    this.servicio.resolverHoraExtra(h.id, accion).subscribe({
      next: () => {
        this.resolviendo.set(false);
        this.avisos.exito(mensaje);
        this.lista.cargar();
      },
      error: () => this.resolviendo.set(false),
    });
  }
}
