import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rutaInicialPara } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

/** Pantalla de 403 y 404; el contenido llega por `data` de la ruta. */
@Component({
  selector: 'app-pagina-error',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="error">
      <p class="error__codigo">{{ codigo() }}</p>
      <h1>{{ titulo() }}</h1>
      <p>{{ mensaje() }}</p>
      <a class="boton" [routerLink]="inicio()">{{
        autenticado() ? 'Volver al inicio' : 'Ir al login'
      }}</a>
    </main>
  `,
  styleUrl: './pagina-error.scss',
})
export class PaginaError {
  private readonly auth = inject(AuthService);
  readonly codigo = input.required<string>();
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();

  protected readonly autenticado = this.auth.autenticado;
  protected readonly inicio = computed(() => rutaInicialPara(this.auth.rol()));
}
