import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';

@Component({
  selector: 'app-panel-inicio',
  imports: [EncabezadoPagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Panel"
      [subtitulo]="'Bienvenido, ' + (usuario()?.nombre ?? '')"
    />
    <section class="tarjeta">
      <h2>Estamos preparando tu panel</h2>
      <p>Aquí verás el resumen de personal, asistencia y planilla del mes.</p>
    </section>
  `,
  styles: `
    .tarjeta {
      padding: 24px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }
    p {
      margin: 0;
      color: var(--color-texto-secundario);
    }
  `,
})
export class PanelInicio {
  protected readonly usuario = inject(AuthService).usuario;
}
