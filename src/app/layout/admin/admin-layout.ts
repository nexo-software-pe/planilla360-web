import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PaginadorEs } from '../../shared/paginador-es';
import { NAVEGACION_ADMIN, itemsPara } from '../navegacion';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // los paginadores de las pantallas hijas hablan español (se provee aquí para no inflar el bundle inicial)
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
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
