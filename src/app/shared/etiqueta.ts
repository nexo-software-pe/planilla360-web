import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type Tono = 'exito' | 'advertencia' | 'error' | 'info' | 'neutro';

/** Estado como etiqueta de color (nunca solo color: siempre lleva texto). */
@Component({
  selector: 'app-etiqueta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="etiqueta" [class]="'etiqueta etiqueta--' + tono()">{{ texto() }}</span>`,
  styles: `
    .etiqueta {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 20px;
      white-space: nowrap;
    }
    .etiqueta--exito {
      background: var(--color-primario-suave);
      color: var(--color-primario-hover);
    }
    .etiqueta--advertencia {
      background: var(--color-advertencia-fondo);
      color: var(--color-advertencia-texto);
    }
    .etiqueta--error {
      background: var(--color-error-fondo);
      color: var(--color-error-texto);
    }
    .etiqueta--info {
      background: var(--color-info-fondo);
      color: var(--color-info-texto);
    }
    .etiqueta--neutro {
      background: #eceff3;
      color: #3a4351;
    }
  `,
})
export class Etiqueta {
  readonly texto = input.required<string>();
  readonly tono = input<Tono>('neutro');
}
