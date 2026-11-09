import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NotificacionService } from '../../core/http/notificacion.service';
import { descargarBlob } from '../../shared/descarga';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { nombreDeMes } from '../../shared/fechas';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { Boleta, PlanillaService } from '../planilla/planilla.service';

/** Mis boletas: listado y descarga del PDF de cada una. */
@Component({
  selector: 'app-portal-boletas',
  imports: [MatButtonModule, MatPaginatorModule, EncabezadoPagina, EstadoLista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Mis boletas" />
    @if (lista.datos(); as p) {
      @if (p.contenido.length > 0) {
        <ul class="lista" aria-label="Boletas de pago">
          @for (b of p.contenido; track b.id) {
            <li class="tarjeta boleta">
              <div>
                <strong>{{ titulo(b) }}</strong>
              </div>
              <button
                mat-stroked-button
                type="button"
                [disabled]="descargando() === b.id"
                [attr.aria-label]="'Descargar la boleta de ' + titulo(b)"
                (click)="descargar(b)"
              >
                Descargar PDF
              </button>
            </li>
          }
        </ul>
        <mat-paginator
          showFirstLastButtons
          [length]="p.totalElementos"
          [pageIndex]="pagina()"
          [pageSize]="10"
          [hidePageSize]="true"
          (page)="cambiarPagina($event)"
          aria-label="Paginación de boletas"
        />
      }
    }
    <app-estado-lista
      [cargando]="lista.cargando() && !lista.datos()"
      [error]="lista.error()"
      [vacio]="lista.datos()?.contenido?.length === 0"
      mensajeVacio="Aún no tienes boletas disponibles."
      (reintentar)="lista.cargar()"
    />
  `,
  styles: `
    .lista {
      display: grid;
      gap: 8px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
    }
    .boleta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 16px;
    }
  `,
})
export class PortalBoletas {
  private readonly servicio = inject(PlanillaService);
  private readonly avisos = inject(NotificacionService);

  protected readonly pagina = signal(0);
  protected readonly descargando = signal<string | null>(null);
  protected readonly lista = recurso<Pagina<Boleta>>(() =>
    this.servicio.boletasMias(this.pagina(), 10),
  );

  constructor() {
    this.lista.cargar();
  }

  protected titulo(b: Boleta): string {
    const tipo = b.tipo === 'MENSUAL' ? '' : b.tipo === 'CTS' ? ' · CTS' : ' · Gratificación';
    return `${nombreDeMes(b.periodo)}${tipo}`;
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.lista.cargar();
  }

  protected descargar(b: Boleta): void {
    this.descargando.set(b.id);
    this.servicio.pdfBoleta(b.id).subscribe({
      next: (blob) => {
        this.descargando.set(null);
        descargarBlob(blob, `boleta-${b.periodo}.pdf`);
      },
      error: () => {
        this.descargando.set(null);
        this.avisos.error('No se pudo descargar la boleta.');
      },
    });
  }
}
