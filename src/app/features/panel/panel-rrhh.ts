import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_PLANILLA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { mesActual, nombreDeMes } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { PanelService } from './panel.service';

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

interface Alerta {
  tono: 'advertencia' | 'error' | 'info';
  texto: string;
  enlace?: string;
  accion?: string;
}

@Component({
  selector: 'app-panel-rrhh',
  imports: [RouterLink, MatButtonModule, EncabezadoPagina, EstadoLista, Etiqueta, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Panel de RRHH"
      [subtitulo]="'Resumen de ' + nombreMes + ' · ' + (usuario()?.nombre ?? '')"
    >
      <a mat-stroked-button routerLink="/panel/empleados/importar">Importar empleados</a>
      <a mat-flat-button routerLink="/panel/empleados/nuevo">Nuevo empleado</a>
    </app-encabezado-pagina>

    @if (datos.datos(); as d) {
      <div class="pila">
        <section class="indicadores" aria-label="Indicadores del personal">
          <article class="tarjeta indicador">
            <h2>Personal activo</h2>
            <p class="cifra-grande">{{ d.activos }}</p>
            <p class="detalle">
              {{ d.enVacaciones }} de vacaciones · {{ d.conLicencia }} con licencia
            </p>
          </article>
          <article class="tarjeta indicador">
            <h2>Solicitudes por aprobar</h2>
            <p class="cifra-grande">{{ porAprobar() }}</p>
            <p class="detalle">
              <a routerLink="/panel/vacaciones/bandeja"
                >{{ d.vacacionesPorAprobar }} vacaciones · {{ d.permisosPorAprobar }} permisos</a
              >
              ·
              <a routerLink="/panel/asistencia/horas-extra"
                >{{ d.horasExtraPendientes }} horas extra</a
              >
            </p>
          </article>
          <article class="tarjeta indicador">
            <h2>Tardanzas del mes</h2>
            <p class="cifra-grande">{{ d.tardanzasDelMes }}</p>
            <p class="detalle">
              <a routerLink="/panel/asistencia/resumen">Ver resumen de asistencia</a>
            </p>
          </article>
        </section>

        <div class="dos-columnas">
          <section class="tarjeta" aria-labelledby="titulo-planilla">
            <h2 id="titulo-planilla">Planilla de {{ nombreMes }}</h2>
            @if (d.planilla; as p) {
              <p>
                <app-etiqueta [texto]="estado(p.estado).texto" [tono]="estado(p.estado).tono" />
              </p>
              <dl class="totales">
                <div>
                  <dt>Trabajadores</dt>
                  <dd class="cifra">{{ p.trabajadores }}</dd>
                </div>
                <div>
                  <dt>Total ingresos</dt>
                  <dd class="cifra">{{ p.totalIngresos | soles }}</dd>
                </div>
                <div>
                  <dt>Total descuentos</dt>
                  <dd class="cifra">{{ p.totalDescuentos | soles }}</dd>
                </div>
                <div>
                  <dt>Neto a pagar</dt>
                  <dd class="cifra neto">{{ p.totalNeto | soles }}</dd>
                </div>
              </dl>
              @if (p.estado === 'BORRADOR') {
                <p class="aviso aviso--advertencia">
                  La planilla aún no se calcula. Los totales aparecen al calcularla.
                </p>
              }
            } @else {
              <p class="aviso aviso--info">Todavía no se creó la planilla de {{ nombreMes }}.</p>
            }
          </section>

          <section class="tarjeta" aria-labelledby="titulo-alertas">
            <h2 id="titulo-alertas">Alertas</h2>
            @if (alertas().length > 0) {
              <ul class="alertas">
                @for (a of alertas(); track a.texto) {
                  <li class="aviso" [class]="'aviso aviso--' + a.tono">
                    {{ a.texto }}
                    @if (a.enlace) {
                      <a [routerLink]="a.enlace">{{ a.accion }}</a>
                    }
                  </li>
                }
              </ul>
            } @else {
              <p class="sin-alertas">Todo en orden: no hay alertas por atender.</p>
            }
          </section>
        </div>

        <section class="tarjeta" aria-labelledby="titulo-cumples">
          <h2 id="titulo-cumples">Cumpleaños de {{ nombreMes }}</h2>
          @if (d.cumpleanos.length > 0) {
            <ul class="cumples">
              @for (c of d.cumpleanos; track c.nombre) {
                <li>
                  <span class="dia cifra">{{ c.dia }}</span>
                  <span>{{ c.nombre }}</span>
                  <span class="edad">{{ c.edad }} años</span>
                </li>
              }
            </ul>
          } @else {
            <p class="sin-alertas">Nadie cumple años este mes.</p>
          }
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
    .indicadores {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .indicador h2 {
      margin: 0;
      color: var(--color-texto-secundario);
      font-family: var(--fuente-texto);
      font-size: 14px;
      font-weight: 500;
    }
    .cifra-grande {
      margin: 4px 0;
      font-family: var(--fuente-titulo);
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
    }
    .detalle {
      margin: 0;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
    a {
      color: var(--color-primario);
    }
    .dos-columnas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
      gap: 16px;
    }
    .totales {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 16px;
      margin: 0 0 12px;
    }
    dt {
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
    dd {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      text-align: left;
    }
    .neto {
      color: var(--color-primario-hover);
      font-family: var(--fuente-titulo);
    }
    .alertas,
    .cumples {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .alertas a {
      margin-left: 8px;
      font-weight: 600;
      color: inherit;
      text-decoration: underline;
    }
    .sin-alertas {
      margin: 0;
      color: var(--color-texto-secundario);
    }
    .cumples li {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .dia {
      min-width: 28px;
      padding: 2px 6px;
      border-radius: var(--radio-control);
      background: var(--color-primario-suave);
      color: var(--color-primario-hover);
      font-weight: 600;
      text-align: center;
    }
    .edad {
      margin-left: auto;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
  `,
})
export class PanelRrhh {
  private readonly servicio = inject(PanelService);
  protected readonly usuario = inject(AuthService).usuario;

  private readonly mes = mesActual();
  protected readonly nombreMes = nombreDeMes(this.mes);
  protected readonly datos = recurso(() => this.servicio.indicadoresRrhh(this.mes));

  protected readonly porAprobar = computed(() => {
    const d = this.datos.datos();
    return d ? d.vacacionesPorAprobar + d.permisosPorAprobar + d.horasExtraPendientes : 0;
  });

  protected readonly alertas = computed<Alerta[]>(() => {
    const d = this.datos.datos();
    if (!d) return [];
    const lista: Alerta[] = [];
    if (!d.planilla) {
      lista.push({
        tono: 'info',
        texto: `Falta crear la planilla de ${this.nombreMes}.`,
      });
    } else if (d.planilla.estado === 'BORRADOR' || d.planilla.estado === 'CALCULADA') {
      lista.push({
        tono: 'advertencia',
        texto: `La planilla de ${this.nombreMes} está en estado ${this.estado(d.planilla.estado).texto.toLowerCase()}: aún no se cierra.`,
      });
    }
    if (d.periodosVencidos.length > 0) {
      lista.push({
        tono: 'error',
        texto:
          plural(
            d.periodosVencidos.length,
            'periodo de vacaciones vencido sin gozar',
            'periodos de vacaciones vencidos sin gozar',
          ) + '.',
        enlace: '/panel/vacaciones/saldos',
        accion: 'Ver saldos',
      });
    }
    if (d.horasExtraPendientes > 0) {
      lista.push({
        tono: 'advertencia',
        texto:
          plural(
            d.horasExtraPendientes,
            'solicitud de horas extra espera',
            'solicitudes de horas extra esperan',
          ) + ' aprobación.',
        enlace: '/panel/asistencia/horas-extra',
        accion: 'Revisar',
      });
    }
    if (d.vacacionesPorAprobar + d.permisosPorAprobar > 0) {
      lista.push({
        tono: 'advertencia',
        texto:
          plural(
            d.vacacionesPorAprobar + d.permisosPorAprobar,
            'solicitud de vacaciones o permisos por resolver',
            'solicitudes de vacaciones o permisos por resolver',
          ) + '.',
        enlace: '/panel/vacaciones/bandeja',
        accion: 'Ir a la bandeja',
      });
    }
    return lista;
  });

  constructor() {
    this.datos.cargar();
  }

  protected estado(e: string) {
    return estadoVisual(ESTADO_PLANILLA, e);
  }
}
