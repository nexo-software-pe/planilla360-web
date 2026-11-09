import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_EMPLEADO, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { CatalogoService } from '../catalogo/catalogo.service';
import { Empleado, EmpleadosService, FiltrosEmpleados } from './empleados.service';

@Component({
  selector: 'app-empleados-lista',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Empleados" subtitulo="Personal de la empresa activa">
      <a mat-stroked-button routerLink="importar">Importar desde Excel</a>
      <a mat-flat-button routerLink="nuevo">Nuevo empleado</a>
    </app-encabezado-pagina>

    <form class="filtros" [formGroup]="filtros" role="search" aria-label="Filtros de empleados">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Buscar por nombre, DNI o correo</mat-label>
        <input matInput type="search" formControlName="q" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Área</mat-label>
        <mat-select formControlName="areaId">
          <mat-option value="">Todas</mat-option>
          @for (a of areas(); track a.id) {
            <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Cargo</mat-label>
        <mat-select formControlName="cargoId">
          <mat-option value="">Todos</mat-option>
          @for (c of cargosFiltrados(); track c.id) {
            <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="">Todos</mat-option>
          @for (e of estados; track e.valor) {
            <mat-option [value]="e.valor">{{ e.texto }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Ingreso desde</mat-label>
        <input matInput type="date" formControlName="ingresoDesde" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Ingreso hasta</mat-label>
        <input matInput type="date" formControlName="ingresoHasta" />
      </mat-form-field>
      <button mat-button type="button" (click)="limpiar()">Limpiar filtros</button>
    </form>

    <section class="tabla-caja" aria-label="Lista de empleados">
      @if (lista.datos(); as pagina) {
        @if (pagina.contenido.length > 0) {
          <table class="tabla">
            <caption class="solo-lector">
              Empleados
            </caption>
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col">DNI</th>
                <th scope="col">Área</th>
                <th scope="col">Cargo</th>
                <th scope="col">Ingreso</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (e of pagina.contenido; track e.id) {
                <tr>
                  <td>
                    <a [routerLink]="[e.id]"
                      ><strong>{{ e.apellidos }}, {{ e.nombres }}</strong></a
                    >
                  </td>
                  <td class="cifra">{{ e.dni }}</td>
                  <td>{{ nombreArea(e) }}</td>
                  <td>{{ nombreCargo(e) }}</td>
                  <td>{{ e.fechaIngreso | fecha }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(e).texto" [tono]="visual(e).tono" />
                  </td>
                  <td>
                    <a
                      mat-button
                      [routerLink]="[e.id]"
                      [attr.aria-label]="'Ver ficha de ' + e.nombres + ' ' + e.apellidos"
                      >Ver ficha</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
      <app-estado-lista
        [cargando]="lista.cargando() && !lista.datos()"
        [error]="lista.error()"
        [vacio]="!lista.cargando() && !lista.error() && lista.datos()?.contenido?.length === 0"
        mensajeVacio="No hay empleados que coincidan con los filtros."
        (reintentar)="lista.cargar()"
      />
      <mat-paginator
        [length]="lista.datos()?.totalElementos ?? 0"
        [pageIndex]="pagina()"
        [pageSize]="tamano()"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="cambiarPagina($event)"
        aria-label="Paginación de empleados"
      />
    </section>
  `,
  styles: `
    a:not([mat-button]):not([mat-flat-button]):not([mat-stroked-button]) {
      color: var(--color-primario);
    }
  `,
})
export class EmpleadosLista {
  private readonly servicio = inject(EmpleadosService);
  private readonly catalogo = inject(CatalogoService);
  private readonly fb = inject(FormBuilder);

  protected readonly estados = Object.entries(ESTADO_EMPLEADO).map(([valor, v]) => ({
    valor,
    texto: v.texto,
  }));

  protected readonly filtros = this.fb.nonNullable.group({
    q: '',
    areaId: '',
    cargoId: '',
    estado: '',
    ingresoDesde: '',
    ingresoHasta: '',
  });

  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);

  protected readonly areas = toSignal(this.catalogo.areas(), { initialValue: [] });
  private readonly cargos = toSignal(this.catalogo.cargos(), { initialValue: [] });
  private readonly valores = toSignal(
    this.filtros.valueChanges.pipe(
      debounceTime(300),
      map(() => this.filtros.getRawValue()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      startWith(this.filtros.getRawValue()),
    ),
    { requireSync: true },
  );

  protected readonly cargosFiltrados = computed(() => {
    const area = this.valores().areaId;
    return this.cargos().filter((c) => !area || c.areaId === area);
  });

  protected readonly lista = recurso<Pagina<Empleado>>(() =>
    this.servicio.listar(
      this.filtros.getRawValue() as FiltrosEmpleados,
      this.pagina(),
      this.tamano(),
    ),
  );

  constructor() {
    // al cambiar un filtro se vuelve a la primera página y se recarga
    this.filtros.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.lista.cargar();
    });
    this.filtros.controls.areaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.filtros.controls.cargoId.setValue(''));
    this.lista.cargar();
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.tamano.set(e.pageSize);
    this.lista.cargar();
  }

  protected limpiar(): void {
    this.filtros.reset();
  }

  protected visual(e: Empleado) {
    return estadoVisual(ESTADO_EMPLEADO, e.estado);
  }

  protected nombreArea(e: Empleado): string {
    return this.areas().find((a) => a.id === e.areaId)?.nombre ?? '—';
  }

  protected nombreCargo(e: Empleado): string {
    return this.cargos().find((c) => c.id === e.cargoId)?.nombre ?? '—';
  }
}
