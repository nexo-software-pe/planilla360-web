import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_ASISTENCIA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { formatearMinutos, mesActual } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { AsistenciaDiaria, AsistenciaService } from './asistencia.service';

/** Detalle diario de un empleado en un mes. Lo usan la ficha y la pantalla de asistencia. */
@Component({
  selector: 'app-asistencia-tabla',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, EstadoLista, Etiqueta, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (conSelectorDeMes()) {
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
    }
    <section class="tabla-caja" aria-label="Asistencia diaria">
      @if (lista.datos(); as dias) {
        @if (dias.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Estado</th>
                <th scope="col" class="cifra">Tardanza</th>
                <th scope="col" class="cifra">Horas extra</th>
              </tr>
            </thead>
            <tbody>
              @for (d of dias; track d.fecha) {
                <tr>
                  <td>{{ d.fecha | fecha }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(d).texto" [tono]="visual(d).tono" />
                  </td>
                  <td class="cifra">{{ minutos(d.minutosTardanza) }}</td>
                  <td class="cifra">{{ minutos(d.minutosExtra) }}</td>
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
  `,
})
export class AsistenciaTabla {
  readonly empleadoId = input.required<string>();
  readonly mesInicial = input<string>();
  readonly conSelectorDeMes = input(true);

  private readonly servicio = inject(AsistenciaService);

  protected readonly mes = signal(mesActual());
  protected readonly mesTope = mesActual();
  protected readonly minutos = formatearMinutos;

  protected readonly lista = recurso(() => this.servicio.detalle(this.empleadoId(), this.mes()));

  constructor() {
    queueMicrotask(() => {
      const inicial = this.mesInicial();
      if (inicial) this.mes.set(inicial);
      this.lista.cargar();
    });
  }

  protected cambiarMes(mes: string): void {
    if (!mes) return;
    this.mes.set(mes);
    this.lista.cargar();
  }

  protected visual(d: AsistenciaDiaria) {
    return estadoVisual(ESTADO_ASISTENCIA, d.estado);
  }
}
