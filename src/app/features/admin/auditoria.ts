import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime } from 'rxjs';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { Etiqueta, Tono } from '../../shared/etiqueta';
import { formatearFechaHora } from '../../shared/fechas';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { AdminService, FiltrosAuditoria, RegistroAuditoria } from './admin.service';

const ACCION: Record<RegistroAuditoria['accion'], { texto: string; tono: Tono }> = {
  CREAR: { texto: 'Creó', tono: 'exito' },
  ACTUALIZAR: { texto: 'Modificó', tono: 'info' },
  ELIMINAR: { texto: 'Eliminó', tono: 'error' },
};

@Component({
  selector: 'app-auditoria',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Auditoría"
      subtitulo="Quién cambió qué y cuándo en los datos sensibles"
    />

    <form class="filtros" [formGroup]="filtros" role="search" aria-label="Filtros de auditoría">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Entidad (p. ej. Empleado)</mat-label>
        <input matInput formControlName="entidad" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Desde</mat-label>
        <input matInput type="date" formControlName="desde" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" formControlName="hasta" />
      </mat-form-field>
      <button mat-button type="button" (click)="filtros.reset()">Limpiar filtros</button>
    </form>

    <section class="tabla-caja" aria-label="Registros de auditoría">
      @if (lista.datos(); as p) {
        @if (p.contenido.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Usuario</th>
                <th scope="col">Acción</th>
                <th scope="col">Entidad</th>
                <th scope="col"><span class="solo-lector">Detalle</span></th>
              </tr>
            </thead>
            <tbody>
              @for (r of p.contenido; track r.id) {
                <tr>
                  <td class="cifra">{{ fechaHora(r.instante) }}</td>
                  <td>{{ r.usuario || 'Sistema' }}</td>
                  <td>
                    <app-etiqueta [texto]="accion(r).texto" [tono]="accion(r).tono" />
                  </td>
                  <td>{{ r.entidad }}</td>
                  <td>
                    <button
                      mat-button
                      type="button"
                      [attr.aria-expanded]="abierto() === r.id"
                      (click)="alternar(r)"
                    >
                      {{ abierto() === r.id ? 'Ocultar cambios' : 'Ver cambios' }}
                    </button>
                  </td>
                </tr>
                @if (abierto() === r.id) {
                  <tr>
                    <td colspan="5" class="detalle">
                      <div class="comparacion">
                        <div>
                          <h3>Antes</h3>
                          <pre>{{ json(r.antes) }}</pre>
                        </div>
                        <div>
                          <h3>Después</h3>
                          <pre>{{ json(r.despues) }}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        }
      }
      <app-estado-lista
        [cargando]="lista.cargando() && !lista.datos()"
        [error]="lista.error()"
        [vacio]="lista.datos()?.contenido?.length === 0"
        mensajeVacio="No hay registros de auditoría con estos filtros."
        (reintentar)="lista.cargar()"
      />
      <mat-paginator
        [length]="lista.datos()?.totalElementos ?? 0"
        [pageIndex]="pagina()"
        [pageSize]="tamano()"
        [pageSizeOptions]="[20, 50, 100]"
        (page)="cambiarPagina($event)"
        aria-label="Paginación de auditoría"
      />
    </section>
  `,
  styles: `
    .detalle {
      background: #fafbfc;
    }
    .comparacion {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 14px;
    }
    pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      font-size: 12px;
    }
  `,
})
export class Auditoria {
  private readonly servicio = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly filtros = this.fb.nonNullable.group({ entidad: '', desde: '', hasta: '' });
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly abierto = signal<string | null>(null);
  protected readonly fechaHora = formatearFechaHora;

  protected readonly lista = recurso<Pagina<RegistroAuditoria>>(() =>
    this.servicio.auditoria(
      this.filtros.getRawValue() as FiltrosAuditoria,
      this.pagina(),
      this.tamano(),
    ),
  );

  constructor() {
    this.filtros.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.abierto.set(null);
      this.lista.cargar();
    });
    this.lista.cargar();
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.tamano.set(e.pageSize);
    this.abierto.set(null);
    this.lista.cargar();
  }

  protected accion(r: RegistroAuditoria) {
    return ACCION[r.accion];
  }

  protected alternar(r: RegistroAuditoria): void {
    this.abierto.update((actual) => (actual === r.id ? null : r.id));
  }

  protected json(valor: unknown): string {
    return valor ? JSON.stringify(valor, null, 2) : '—';
  }
}
