import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NAVEGACION_ADMIN, itemsPara } from '../navegacion';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.usuario;
  protected readonly empresa = this.auth.empresa;
  protected readonly items = computed(() => itemsPara(NAVEGACION_ADMIN, this.auth.rol()));

  protected salir(): void {
    this.auth.cerrarSesion().subscribe();
  }
}
