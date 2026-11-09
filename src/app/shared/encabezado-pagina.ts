import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Encabezado de pantalla: título, subtítulo y acciones (se proyectan dentro). */
@Component({
  selector: 'app-encabezado-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="encabezado">
      <div>
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="acciones"><ng-content /></div>
    </header>
  `,
  styles: `
    .encabezado {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: clamp(22px, 5vw, 28px);
    }
    p {
      margin: 4px 0 0;
      color: var(--color-texto-secundario);
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class EncabezadoPagina {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
}
