import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';

@Component({
  selector: 'app-vacaciones-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, EncabezadoPagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Vacaciones y permisos"
      subtitulo="Bandeja de aprobación y saldos del personal"
    />
    <nav mat-tab-nav-bar [tabPanel]="panel" aria-label="Secciones de vacaciones y permisos">
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
export class VacacionesShell {
  protected readonly pestanas = [
    { ruta: 'bandeja', etiqueta: 'Bandeja de aprobación' },
    { ruta: 'saldos', etiqueta: 'Saldos' },
  ];
}
