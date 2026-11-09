import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_ASISTENCIA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { formatearMinutos, mesActual } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { AsistenciaDiaria, AsistenciaService } from '../asistencia/asistencia.service';

/** Mi asistencia: el mes día por día, en lista (no tabla) para que se lea bien en el celular. */
@Component({
  selector: 'app-portal-asistencia',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Mi asistencia" />
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

    @if (lista.datos(); as dias) {
      @if (dias.length > 0) {
        <ul class="dias" aria-label="Asistencia del mes">
          @for (d of dias; track d.fecha) {
            <li class="tarjeta dia">
              <div>
                <strong>{{ d.fecha | fecha }}</strong>
                @if (d.minutosTardanza > 0 || d.minutosExtra > 0) {
                  <p class="detalle">
                    @if (d.minutosTardanza > 0) {
                      Tardanza {{ minutos(d.minutosTardanza) }}
                    }
                    @if (d.minutosExtra > 0) {
                      Horas extra {{ minutos(d.minutosExtra) }}
                    }
                  </p>
                }
              </div>
              <app-etiqueta [texto]="visual(d).texto" [tono]="visual(d).tono" />
            </li>
          }
        </ul>
      }
    }
    <app-estado-lista
      [cargando]="lista.cargando() && !lista.datos()"
      [error]="lista.error()"
      [vacio]="lista.datos()?.length === 0"
      mensajeVacio="Todavía no hay asistencia consolidada para este mes."
      (reintentar)="lista.cargar()"
    />
  `,
  styles: `
    .mes {
      width: 100%;
      margin-bottom: 12px;
    }
    .dias {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dia {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 16px;
    }
    .detalle {
      margin: 0;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
  `,
})
export class PortalAsistencia {
  private readonly servicio = inject(AsistenciaService);

  protected readonly mes = signal(mesActual());
  protected readonly mesTope = mesActual();
  protected readonly minutos = formatearMinutos;
  protected readonly lista = recurso(() => this.servicio.miAsistencia(this.mes()));

  constructor() {
    this.lista.cargar();
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
