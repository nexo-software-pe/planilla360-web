import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_SOLICITUD_VACACIONES, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { VacacionesService } from '../vacaciones/vacaciones.service';

/** Saldo y solicitudes de vacaciones de un empleado (vista de RRHH). */
@Component({
  selector: 'app-ficha-vacaciones',
  imports: [EstadoLista, Etiqueta, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (datos.datos(); as d) {
      <div class="pila">
        <section>
          <h2>Saldo por periodo</h2>
          <div class="tabla-caja">
            @if (d.saldos.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Periodo</th>
                    <th scope="col" class="cifra">Saldo (días)</th>
                    <th scope="col">Situación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of d.saldos; track s.periodoDesde) {
                    <tr>
                      <td>{{ s.periodoDesde | fecha }} – {{ s.periodoHasta | fecha }}</td>
                      <td class="cifra">{{ s.saldoDias }}</td>
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
            } @else {
              <p class="vacio">Sin saldo pendiente.</p>
            }
          </div>
          <p class="total">
            Saldo total: <strong>{{ total() }} días</strong>
          </p>
        </section>
        <section>
          <h2>Solicitudes</h2>
          <div class="tabla-caja">
            @if (d.solicitudes.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col" class="cifra">Días</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of d.solicitudes; track s.id) {
                    <tr>
                      <td>{{ s.desde | fecha }}</td>
                      <td>{{ s.hasta | fecha }}</td>
                      <td class="cifra">{{ s.dias }}</td>
                      <td>
                        <app-etiqueta
                          [texto]="visual(s.estado).texto"
                          [tono]="visual(s.estado).tono"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">Sin solicitudes de vacaciones.</p>
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
    .total {
      margin: 8px 0 0;
    }
  `,
})
export class FichaVacaciones {
  readonly empleadoId = input.required<string>();

  private readonly servicio = inject(VacacionesService);

  protected readonly datos = recurso(() =>
    forkJoin({
      saldos: this.servicio
        .saldos()
        .pipe(map((todos) => todos.filter((s) => s.empleadoId === this.empleadoId()))),
      solicitudes: this.servicio.solicitudes(undefined, this.empleadoId()),
    }),
  );

  protected readonly total = computed(
    () => this.datos.datos()?.saldos.reduce((acc, s) => acc + s.saldoDias, 0) ?? 0,
  );

  constructor() {
    queueMicrotask(() => this.datos.cargar());
  }

  protected visual(estado: string) {
    return estadoVisual(ESTADO_SOLICITUD_VACACIONES, estado);
  }
}
