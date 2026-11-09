import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-portal-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tarjeta">
      <h2>Tu portal está en camino</h2>
      <p>Pronto podrás marcar tu asistencia, ver tus vacaciones y descargar tus boletas.</p>
    </section>
  `,
  styles: `
    .tarjeta {
      padding: 20px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    p {
      margin: 0;
      color: var(--color-texto-secundario);
    }
  `,
})
export class PortalInicio {}
