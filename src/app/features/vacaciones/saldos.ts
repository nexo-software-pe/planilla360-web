import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EstadoLista } from '../../shared/estado-lista';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { VacacionesService } from './vacaciones.service';

/** Saldo de vacaciones por trabajador y periodo (reporte de vacaciones pendientes). */
@Component({
  selector: 'app-saldos',
  imports: [MatSlideToggleModule, EstadoLista, Etiqueta, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-slide-toggle [checked]="soloVencidos()" (change)="soloVencidos.set($event.checked)">
      Mostrar solo periodos vencidos
    </mat-slide-toggle>

    <section class="tabla-caja" aria-label="Saldos de vacaciones">
      @if (filas().length > 0) {
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Trabajador</th>
              <th scope="col">Periodo</th>
              <th scope="col" class="cifra">Saldo del periodo</th>
              <th scope="col" class="cifra">Saldo total</th>
              <th scope="col">Situación</th>
            </tr>
          </thead>
          <tbody>
            @for (s of filas(); track s.empleadoId + s.periodoDesde) {
              <tr>
                <td>{{ s.trabajador }}</td>
                <td>{{ s.periodoDesde | fecha }} – {{ s.periodoHasta | fecha }}</td>
                <td class="cifra">{{ s.saldoDias }} días</td>
                <td class="cifra">{{ s.saldoTotalDias }} días</td>
                <td>
                  <app-etiqueta
                    [texto]="s.vencido ? 'Vencido' : 'Vigente'"
                    [tono]="s.vencido ? 'error' : 'exito'"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
      <app-estado-lista
        [cargando]="lista.cargando() && !lista.datos()"
        [error]="lista.error()"
        [vacio]="!lista.cargando() && !lista.error() && filas().length === 0"
        mensajeVacio="No hay saldos pendientes con este filtro."
        (reintentar)="lista.cargar()"
      />
    </section>
  `,
  styles: `
    .tabla-caja {
      margin-top: 16px;
    }
  `,
})
export class Saldos {
  private readonly servicio = inject(VacacionesService);

  protected readonly soloVencidos = signal(false);
  protected readonly lista = recurso(() => this.servicio.saldos());
  protected readonly filas = computed(() =>
    (this.lista.datos() ?? []).filter((s) => !this.soloVencidos() || s.vencido),
  );

  constructor() {
    this.lista.cargar();
  }
}
