import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { recurso } from '../../shared/recurso';
import { AdminService } from '../admin/admin.service';

@Component({
  selector: 'app-panel-saas',
  imports: [RouterLink, MatButtonModule, EncabezadoPagina, EstadoLista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Panel de la plataforma"
      [subtitulo]="'Bienvenido, ' + (usuario()?.nombre ?? '')"
    >
      <a mat-flat-button routerLink="/panel/empresas">Administrar empresas</a>
    </app-encabezado-pagina>

    @if (resumen(); as r) {
      <section class="indicadores" aria-label="Indicadores de la plataforma">
        <article class="tarjeta">
          <h2>Empresas activas</h2>
          <p class="cifra-grande">{{ r.activas }}</p>
          <p class="detalle">{{ r.inactivas }} inactivas</p>
        </article>
        @for (p of r.planes; track p.plan) {
          <article class="tarjeta">
            <h2>Plan {{ p.plan }}</h2>
            <p class="cifra-grande">{{ p.cantidad }}</p>
            <p class="detalle">empresas activas</p>
          </article>
        }
      </section>
    }
    <app-estado-lista
      [cargando]="empresas.cargando() && !empresas.datos()"
      [error]="empresas.error()"
      (reintentar)="empresas.cargar()"
    />
  `,
  styles: `
    .indicadores {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    h2 {
      margin: 0 !important;
      color: var(--color-texto-secundario);
      font-family: var(--fuente-texto);
      font-size: 14px !important;
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
  `,
})
export class PanelSaas {
  private readonly servicio = inject(AdminService);
  protected readonly usuario = inject(AuthService).usuario;

  protected readonly empresas = recurso(() => this.servicio.empresas(0, 200));

  protected readonly resumen = computed(() => {
    const lista = this.empresas.datos()?.contenido;
    if (!lista) return null;
    const activas = lista.filter((e) => e.activa);
    const nombres = { BASICO: 'Básico', PROFESIONAL: 'Profesional', EMPRESARIAL: 'Empresarial' };
    return {
      activas: activas.length,
      inactivas: lista.length - activas.length,
      planes: (Object.keys(nombres) as (keyof typeof nombres)[]).map((plan) => ({
        plan: nombres[plan],
        cantidad: activas.filter((e) => e.plan === plan).length,
      })),
    };
  });

  constructor() {
    this.empresas.cargar();
  }
}
