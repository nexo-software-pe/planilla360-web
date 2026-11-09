import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PanelRrhh } from './panel-rrhh';
import { PanelSaas } from './panel-saas';

/** Inicio de administración: la plataforma ve sus empresas; RRHH y admin de empresa, el personal. */
@Component({
  selector: 'app-panel-inicio',
  imports: [PanelRrhh, PanelSaas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rol() === 'ADMIN_SAAS') {
      <app-panel-saas />
    } @else {
      <app-panel-rrhh />
    }
  `,
})
export class PanelInicio {
  protected readonly rol = inject(AuthService).rol;
}
