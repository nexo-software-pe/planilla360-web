import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** Estados de una lista: cargando, con error (con reintento) o vacía. */
@Component({
  selector: 'app-estado-lista',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cargando()) {
      <p class="estado" role="status">Cargando…</p>
    } @else if (error()) {
      <div class="estado estado--error" role="alert">
        <p>{{ error() }}</p>
        <button mat-stroked-button type="button" (click)="reintentar.emit()">Reintentar</button>
      </div>
    } @else if (vacio()) {
      <p class="estado">{{ mensajeVacio() }}</p>
    }
  `,
  styles: `
    .estado {
      margin: 0;
      padding: 32px 16px;
      text-align: center;
      color: var(--color-texto-secundario);
    }
    .estado--error {
      color: var(--color-error-texto);
    }
    .estado--error p {
      margin: 0 0 12px;
    }
  `,
})
export class EstadoLista {
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly vacio = input(false);
  readonly mensajeVacio = input('No hay registros para mostrar.');
  readonly reintentar = output<void>();
}
