import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NAVEGACION_PORTAL, itemsPara } from '../navegacion';

@Component({
  selector: 'app-portal-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalLayout {
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.usuario;
  protected readonly empresa = this.auth.empresa;
  protected readonly items = computed(() => itemsPara(NAVEGACION_PORTAL, this.auth.rol()));

  protected salir(): void {
    this.auth.cerrarSesion().subscribe();
  }
}
