import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_PLANILLA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { mesActual, nombreDeMes } from '../../shared/fechas';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { FiltrosPlanillas, Planilla, PlanillaService } from './planilla.service';

export const TIPO_PLANILLA_TEXTO = {
  MENSUAL: 'Mensual',
  GRATIFICACION: 'Gratificación',
  CTS: 'CTS',
} as const;

@Component({
  selector: 'app-planilla-lista',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    SolesPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Planilla" subtitulo="Planillas mensuales y de beneficios">
      <a mat-stroked-button routerLink="/panel/beneficios">Gratificación y CTS</a>
      @if (!creando()) {
        <button mat-flat-button type="button" (click)="creando.set(true)">Nueva planilla</button>
      }
    </app-encabezado-pagina>

    @if (creando()) {
      <form class="tarjeta formulario" [formGroup]="formCrear" (ngSubmit)="crear()" novalidate>
        <h2>Nueva planilla mensual</h2>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Periodo</mat-label>
            <input matInput type="month" formControlName="periodo" [max]="mesTope" required />
            @if (formCrear.controls.periodo.touched && formCrear.controls.periodo.invalid) {
              <mat-error>{{ error(formCrear.controls.periodo) }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Crear planilla</button>
          <button mat-button type="button" (click)="creando.set(false)">Cancelar</button>
        </div>
      </form>
    }

    <form class="filtros" [formGroup]="filtros" role="search" aria-label="Filtros de planillas">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Periodo</mat-label>
        <input matInput type="month" formControlName="periodo" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Tipo</mat-label>
        <mat-select formControlName="tipo">
          <mat-option value="">Todos</mat-option>
          @for (t of tipos; track t.valor) {
            <mat-option [value]="t.valor">{{ t.texto }}</mat-option>
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
      <button mat-stroked-button type="button" (click)="filtrar()">Filtrar</button>
      <button mat-button type="button" (click)="limpiar()">Limpiar filtros</button>
    </form>

    <section class="tabla-caja" aria-label="Planillas">
      @if (lista.datos(); as p) {
        @if (p.contenido.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col" class="cifra">Trabajadores</th>
                <th scope="col" class="cifra">Ingresos</th>
                <th scope="col" class="cifra">Descuentos</th>
                <th scope="col" class="cifra">Neto</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (pl of p.contenido; track pl.id) {
                <tr>
                  <td>
                    <strong>{{ periodoTexto(pl) }}</strong>
                  </td>
                  <td>{{ tipoTexto(pl) }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(pl).texto" [tono]="visual(pl).tono" />
                  </td>
                  <td class="cifra">{{ pl.trabajadores }}</td>
                  <td class="cifra">{{ pl.totalIngresos | soles }}</td>
                  <td class="cifra">{{ pl.totalDescuentos | soles }}</td>
                  <td class="cifra">{{ pl.totalNeto | soles }}</td>
                  <td>
                    <a
                      mat-button
                      [routerLink]="[pl.id]"
                      [attr.aria-label]="
                        'Abrir la planilla ' + tipoTexto(pl) + ' de ' + periodoTexto(pl)
                      "
                      >Abrir</a
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
        [vacio]="lista.datos()?.contenido?.length === 0"
        mensajeVacio="No hay planillas con estos filtros."
        (reintentar)="lista.cargar()"
      />
      <mat-paginator
        showFirstLastButtons
        [length]="lista.datos()?.totalElementos ?? 0"
        [pageIndex]="pagina()"
        [pageSize]="tamano()"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="cambiarPagina($event)"
        aria-label="Paginación de planillas"
      />
    </section>
  `,
  styles: `
    .formulario {
      margin-bottom: 24px;
    }
  `,
})
export class PlanillaLista {
  private readonly servicio = inject(PlanillaService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly mesTope = mesActual();
  protected readonly tipos = Object.entries(TIPO_PLANILLA_TEXTO).map(([valor, texto]) => ({
    valor,
    texto,
  }));
  protected readonly estados = Object.entries(ESTADO_PLANILLA).map(([valor, v]) => ({
    valor,
    texto: v.texto,
  }));

  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly creando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly filtros = this.fb.nonNullable.group({ periodo: '', tipo: '', estado: '' });
  protected readonly formCrear = this.fb.nonNullable.group({
    periodo: [
      mesActual(),
      [
        Validators.required,
        (c) =>
          String(c.value) > mesActual()
            ? { servidor: 'No puedes crear una planilla de un mes futuro.' }
            : null,
      ],
    ],
  });

  protected readonly lista = recurso<Pagina<Planilla>>(() =>
    this.servicio.listar(
      this.filtros.getRawValue() as FiltrosPlanillas,
      this.pagina(),
      this.tamano(),
    ),
  );

  constructor() {
    this.lista.cargar();
  }

  protected periodoTexto(p: Planilla): string {
    return nombreDeMes(p.periodo);
  }

  protected tipoTexto(p: Planilla): string {
    return TIPO_PLANILLA_TEXTO[p.tipo];
  }

  protected visual(p: Planilla) {
    return estadoVisual(ESTADO_PLANILLA, p.estado);
  }

  protected filtrar(): void {
    this.pagina.set(0);
    this.lista.cargar();
  }

  protected limpiar(): void {
    this.filtros.reset();
    this.filtrar();
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.tamano.set(e.pageSize);
    this.lista.cargar();
  }

  protected crear(): void {
    this.formCrear.markAllAsTouched();
    if (this.formCrear.invalid) return;
    this.guardando.set(true);
    this.servicio.crear(this.formCrear.controls.periodo.value).subscribe({
      next: (p) => {
        this.guardando.set(false);
        void this.router.navigate(['/panel/planilla', p.id]);
      },
      error: () => this.guardando.set(false),
    });
  }
}
