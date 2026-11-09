import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';

@Component({
  selector: 'app-asistencia-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, EncabezadoPagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Asistencia"
      subtitulo="Control del personal: resumen, detalle, horas extra y horarios"
    />
    <nav mat-tab-nav-bar [tabPanel]="panel" aria-label="Secciones de asistencia">
      @for (t of pestanas; track t.ruta) {
        <a
          mat-tab-link
          [routerLink]="t.ruta"
          routerLinkActive
          #rla="routerLinkActive"
          [active]="rla.isActive"
          >{{ t.etiqueta }}</a
        >
      }
    </nav>
    <mat-tab-nav-panel #panel>
      <div class="contenido"><router-outlet /></div>
    </mat-tab-nav-panel>
  `,
  styles: `
    .contenido {
      padding-top: 24px;
    }
  `,
})
export class AsistenciaShell {
  protected readonly pestanas = [
    { ruta: 'resumen', etiqueta: 'Resumen mensual' },
    { ruta: 'detalle', etiqueta: 'Detalle diario' },
    { ruta: 'horas-extra', etiqueta: 'Horas extra' },
    { ruta: 'horarios', etiqueta: 'Horarios' },
  ];
}
