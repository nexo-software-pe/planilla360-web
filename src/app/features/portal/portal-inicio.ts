import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { descargarBlob } from '../../shared/descarga';
import { EstadoLista } from '../../shared/estado-lista';
import { Etiqueta } from '../../shared/etiqueta';
import { mesActual, nombreDeMes } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { AsistenciaService, Marcacion } from '../asistencia/asistencia.service';
import { Boleta, PlanillaService } from '../planilla/planilla.service';
import { VacacionesService } from '../vacaciones/vacaciones.service';

/** Mi inicio: marcar entrada o salida, vacaciones disponibles, resumen del mes y últimas boletas. */
@Component({
  selector: 'app-portal-inicio',
  imports: [RouterLink, MatButtonModule, EstadoLista, Etiqueta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pila">
      <section class="tarjeta" aria-labelledby="titulo-marcar">
        <h2 id="titulo-marcar">Marcación de asistencia</h2>
        @if (ultima(); as m) {
          <p class="resultado" role="status">
            <app-etiqueta
              [texto]="m.tipo === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'"
              tono="exito"
            />
            a las <strong>{{ hora(m) }}</strong>
          </p>
        } @else {
          <p class="ayuda">Pulsa para registrar tu entrada o tu salida de hoy.</p>
        }
        <button
          mat-flat-button
          type="button"
          class="marcar"
          [disabled]="marcando()"
          (click)="marcar()"
        >
          {{ marcando() ? 'Registrando…' : 'Marcar ahora' }}
        </button>
      </section>

      @if (datos.datos(); as d) {
        <section class="tarjeta" aria-labelledby="titulo-vac">
          <h2 id="titulo-vac">Vacaciones disponibles</h2>
          <p class="cifra-grande">
            {{ d.saldo.diasDisponibles }}
            <span class="unidad">{{ d.saldo.diasDisponibles === 1 ? 'día' : 'días' }}</span>
          </p>
          <a mat-stroked-button routerLink="/portal/vacaciones">Solicitar vacaciones</a>
        </section>

        <section class="tarjeta" aria-labelledby="titulo-mes">
          <h2 id="titulo-mes">Tu asistencia en {{ nombreMes }}</h2>
          <dl class="resumen">
            <div>
              <dt>Días asistidos</dt>
              <dd>{{ resumen().asistidos }}</dd>
            </div>
            <div>
              <dt>Tardanzas</dt>
              <dd>{{ resumen().tardanzas }}</dd>
            </div>
            <div>
              <dt>Faltas</dt>
              <dd>{{ resumen().faltas }}</dd>
            </div>
          </dl>
          <a mat-button routerLink="/portal/asistencia">Ver detalle</a>
        </section>

        <section class="tarjeta" aria-labelledby="titulo-boletas">
          <h2 id="titulo-boletas">Últimas boletas</h2>
          @if (d.boletas.length > 0) {
            <ul class="boletas">
              @for (b of d.boletas; track b.id) {
                <li>
                  <span>{{ tituloBoleta(b) }}</span>
                  <button
                    mat-button
                    type="button"
                    [attr.aria-label]="'Descargar la boleta de ' + tituloBoleta(b)"
                    (click)="descargar(b)"
                  >
                    Descargar
                  </button>
                </li>
              }
            </ul>
            <a mat-button routerLink="/portal/boletas">Ver todas</a>
          } @else {
            <p class="ayuda">Aún no tienes boletas disponibles.</p>
          }
        </section>
      }
      <app-estado-lista
        [cargando]="datos.cargando() && !datos.datos()"
        [error]="datos.error()"
        (reintentar)="datos.cargar()"
      />
    </div>
  `,
  styles: `
    .tarjeta {
      padding: 16px;
    }
    .resultado,
    .ayuda {
      margin: 0 0 12px;
    }
    .ayuda {
      color: var(--color-texto-secundario);
    }
    .marcar {
      width: 100%;
      min-height: 52px;
      font-size: 16px;
    }
    .cifra-grande {
      margin: 0 0 12px;
      font-family: var(--fuente-titulo);
      font-size: 40px;
      font-weight: 700;
      line-height: 1;
    }
    .unidad {
      font-family: var(--fuente-texto);
      font-size: 16px;
      font-weight: 500;
      color: var(--color-texto-secundario);
    }
    .resumen {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 0 0 8px;
      text-align: center;
    }
    dt {
      color: var(--color-texto-secundario);
      font-size: 12px;
    }
    dd {
      margin: 0;
      font-family: var(--fuente-titulo);
      font-size: 24px;
      font-weight: 700;
    }
    .boletas {
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
    }
    .boletas li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid var(--color-borde);
    }
  `,
})
export class PortalInicio {
  private readonly asistencia = inject(AsistenciaService);
  private readonly vacaciones = inject(VacacionesService);
  private readonly planillas = inject(PlanillaService);
  private readonly avisos = inject(NotificacionService);

  private readonly mes = mesActual();
  protected readonly nombreMes = nombreDeMes(this.mes);
  protected readonly marcando = signal(false);
  protected readonly ultima = signal<Marcacion | null>(null);

  protected readonly datos = recurso(() =>
    forkJoin({
      saldo: this.vacaciones.miSaldo(),
      mia: this.asistencia.miAsistencia(this.mes),
      boletas: this.planillas.boletasMias(0, 3).pipe(map((p) => p.contenido)),
    }),
  );

  protected readonly resumen = computed(() => {
    const dias = this.datos.datos()?.mia ?? [];
    return {
      asistidos: dias.filter((d) => d.estado === 'PRESENTE' || d.estado === 'TARDANZA').length,
      tardanzas: dias.filter((d) => d.estado === 'TARDANZA').length,
      faltas: dias.filter((d) => d.estado === 'FALTA').length,
    };
  });

  constructor() {
    this.datos.cargar();
  }

  protected hora(m: Marcacion): string {
    return new Date(m.instante).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  protected tituloBoleta(b: Boleta): string {
    const tipo = b.tipo === 'MENSUAL' ? '' : b.tipo === 'CTS' ? ' · CTS' : ' · Gratificación';
    return `${nombreDeMes(b.periodo)}${tipo}`;
  }

  protected marcar(): void {
    this.marcando.set(true);
    this.asistencia.marcar().subscribe({
      next: (m) => {
        this.marcando.set(false);
        this.ultima.set(m);
        this.avisos.exito(m.tipo === 'ENTRADA' ? 'Entrada registrada.' : 'Salida registrada.');
        this.datos.cargar();
      },
      error: () => this.marcando.set(false),
    });
  }

  protected descargar(b: Boleta): void {
    this.planillas.pdfBoleta(b.id).subscribe({
      next: (blob) => descargarBlob(blob, `boleta-${b.periodo}.pdf`),
      error: () => this.avisos.error('No se pudo descargar la boleta.'),
    });
  }
}
