import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { EstadoLista } from '../../shared/estado-lista';
import { formatearMinutos, mesActual, nombreDeMes } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { AsistenciaService } from './asistencia.service';

@Component({
  selector: 'app-asistencia-resumen',
  imports: [FormsModule, RouterLink, MatFormFieldModule, MatInputModule, EstadoLista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="mes">
      <mat-label>Mes</mat-label>
      <input
        matInput
        type="month"
        [ngModel]="mes()"
        (ngModelChange)="cambiarMes($event)"
        [max]="mesTope"
      />
    </mat-form-field>

    <section class="tabla-caja" [attr.aria-label]="'Resumen de ' + nombreMes()">
      @if (lista.datos(); as filas) {
        @if (filas.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col" class="cifra">Días asistidos</th>
                <th scope="col" class="cifra">Justificados</th>
                <th scope="col" class="cifra">Faltas</th>
                <th scope="col" class="cifra">Tardanzas</th>
                <th scope="col" class="cifra">Min. de tardanza</th>
                <th scope="col" class="cifra">Horas extra</th>
              </tr>
            </thead>
            <tbody>
              @for (f of filas; track f.empleadoId) {
                <tr>
                  <td>
                    <a
                      [routerLink]="['../detalle']"
                      [queryParams]="{ empleadoId: f.empleadoId, mes: mes() }"
                      >{{ f.nombreCompleto }}</a
                    >
                  </td>
                  <td class="cifra">{{ f.diasAsistidos }}</td>
                  <td class="cifra">{{ f.diasJustificados }}</td>
                  <td class="cifra">{{ f.faltas }}</td>
                  <td class="cifra">{{ f.tardanzas }}</td>
                  <td class="cifra">{{ minutos(f.minutosTardanza) }}</td>
                  <td class="cifra">{{ minutos(f.minutosExtra) }}</td>
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
        mensajeVacio="No hay asistencia consolidada para este mes."
        (reintentar)="lista.cargar()"
      />
    </section>
  `,
  styles: `
    .mes {
      margin-bottom: 16px;
    }
    a {
      color: var(--color-primario);
    }
  `,
})
export class AsistenciaResumen {
  private readonly servicio = inject(AsistenciaService);

  protected readonly mes = signal(mesActual());
  protected readonly mesTope = mesActual();
  protected readonly minutos = formatearMinutos;
  protected readonly lista = recurso(() => this.servicio.resumen(this.mes()));

  constructor() {
    this.lista.cargar();
  }

  protected nombreMes(): string {
    return nombreDeMes(this.mes());
  }

  protected cambiarMes(mes: string): void {
    if (!mes) return;
    this.mes.set(mes);
    this.lista.cargar();
  }
}
