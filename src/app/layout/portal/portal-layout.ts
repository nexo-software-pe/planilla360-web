import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PaginadorEs } from '../../shared/paginador-es';
import { NAVEGACION_PORTAL, itemsPara } from '../navegacion';

@Component({
  selector: 'app-portal-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // los paginadores de las pantallas hijas hablan español (se provee aquí para no inflar el bundle inicial)
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
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
