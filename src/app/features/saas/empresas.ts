import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_ACTIVO, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { mensajeDeError, rucValidator } from '../../shared/validadores';
import {
  AdminService,
  Empresa,
  EmpresaRequest,
  PlanEmpresa,
  RegimenEmpresa,
} from '../admin/admin.service';

const PLANES: Record<PlanEmpresa, string> = {
  BASICO: 'Básico',
  PROFESIONAL: 'Profesional',
  EMPRESARIAL: 'Empresarial',
};
const REGIMENES: Record<RegimenEmpresa, string> = {
  GENERAL: 'Régimen general',
  PEQUENA_EMPRESA: 'Pequeña empresa',
};

@Component({
  selector: 'app-empresas',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Empresas" subtitulo="Empresas cliente de la plataforma">
      @if (!formulario()) {
        <button mat-flat-button type="button" (click)="nueva()">Nueva empresa</button>
      }
    </app-encabezado-pagina>

    @if (formulario()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2>{{ editando() ? 'Editar empresa' : 'Nueva empresa' }}</h2>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>RUC</mat-label>
            <input matInput formControlName="ruc" inputmode="numeric" maxlength="11" required />
            @if (form.controls.ruc.touched && form.controls.ruc.invalid) {
              <mat-error>{{ error(form.controls.ruc) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Razón social</mat-label>
            <input matInput formControlName="razonSocial" required />
            @if (form.controls.razonSocial.touched && form.controls.razonSocial.invalid) {
              <mat-error>{{ error(form.controls.razonSocial) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Régimen laboral</mat-label>
            <mat-select formControlName="regimenLaboral" required>
              @for (r of regimenes; track r.valor) {
                <mat-option [value]="r.valor">{{ r.texto }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Plan</mat-label>
            <mat-select formControlName="plan" required>
              @for (p of planes; track p.valor) {
                <mat-option [value]="p.valor">{{ p.texto }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">
            {{ editando() ? 'Guardar cambios' : 'Crear empresa' }}
          </button>
          <button mat-button type="button" (click)="cerrar()">Cancelar</button>
        </div>
      </form>
    }

    <div class="filtros">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Estado</mat-label>
        <mat-select [value]="filtro()" (valueChange)="filtrar($event)">
          <mat-option value="">Todas</mat-option>
          <mat-option value="true">Activas</mat-option>
          <mat-option value="false">Inactivas</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <section class="tabla-caja" aria-label="Empresas">
      @if (lista.datos(); as p) {
        @if (p.contenido.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Razón social</th>
                <th scope="col">RUC</th>
                <th scope="col">Régimen</th>
                <th scope="col">Plan</th>
                <th scope="col">Alta</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (e of p.contenido; track e.id) {
                <tr>
                  <td>
                    <strong>{{ e.razonSocial }}</strong>
                  </td>
                  <td class="cifra">{{ e.ruc }}</td>
                  <td>{{ regimen(e) }}</td>
                  <td>{{ plan(e) }}</td>
                  <td>{{ e.creadaEn | fecha }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(e).texto" [tono]="visual(e).tono" />
                  </td>
                  <td>
                    <div class="acciones-fila">
                      <button
                        mat-button
                        type="button"
                        (click)="editar(e)"
                        [attr.aria-label]="'Editar ' + e.razonSocial"
                      >
                        Editar
                      </button>
                      <button
                        mat-button
                        type="button"
                        (click)="alternarEstado(e)"
                        [attr.aria-label]="(e.activa ? 'Desactivar ' : 'Activar ') + e.razonSocial"
                      >
                        {{ e.activa ? 'Desactivar' : 'Activar' }}
                      </button>
                    </div>
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
        mensajeVacio="No hay empresas con este filtro."
        (reintentar)="lista.cargar()"
      />
      <mat-paginator
        showFirstLastButtons
        [length]="lista.datos()?.totalElementos ?? 0"
        [pageIndex]="pagina()"
        [pageSize]="tamano()"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="cambiarPagina($event)"
        aria-label="Paginación de empresas"
      />
    </section>
  `,
  styles: `
    .formulario {
      margin-bottom: 24px;
    }
  `,
})
export class Empresas {
  private readonly servicio = inject(AdminService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly planes = Object.entries(PLANES).map(([valor, texto]) => ({ valor, texto }));
  protected readonly regimenes = Object.entries(REGIMENES).map(([valor, texto]) => ({
    valor,
    texto,
  }));

  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly filtro = signal<'' | 'true' | 'false'>('');
  protected readonly formulario = signal(false);
  protected readonly editando = signal<Empresa | null>(null);
  protected readonly guardando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    ruc: ['', [Validators.required, rucValidator]],
    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
    regimenLaboral: ['GENERAL' as RegimenEmpresa, Validators.required],
    plan: ['BASICO' as PlanEmpresa, Validators.required],
  });

  protected readonly lista = recurso<Pagina<Empresa>>(() =>
    this.servicio.empresas(
      this.pagina(),
      this.tamano(),
      this.filtro() === '' ? undefined : this.filtro() === 'true',
    ),
  );

  constructor() {
    this.lista.cargar();
  }

  protected regimen(e: Empresa): string {
    return REGIMENES[e.regimenLaboral];
  }

  protected plan(e: Empresa): string {
    return PLANES[e.plan];
  }

  protected visual(e: Empresa) {
    return estadoVisual(ESTADO_ACTIVO, e.activa);
  }

  protected filtrar(valor: '' | 'true' | 'false'): void {
    this.filtro.set(valor);
    this.pagina.set(0);
    this.lista.cargar();
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.tamano.set(e.pageSize);
    this.lista.cargar();
  }

  protected nueva(): void {
    this.editando.set(null);
    this.form.reset({ regimenLaboral: 'GENERAL', plan: 'BASICO' });
    this.formulario.set(true);
  }

  protected editar(e: Empresa): void {
    this.editando.set(e);
    this.form.setValue({
      ruc: e.ruc,
      razonSocial: e.razonSocial,
      regimenLaboral: e.regimenLaboral,
      plan: e.plan,
    });
    this.formulario.set(true);
  }

  protected cerrar(): void {
    this.formulario.set(false);
    this.editando.set(null);
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const datos: EmpresaRequest = { ...v, ruc: v.ruc.trim(), razonSocial: v.razonSocial.trim() };
    const actual = this.editando();
    this.guardando.set(true);
    (actual
      ? this.servicio.actualizarEmpresa(actual.id, datos)
      : this.servicio.crearEmpresa(datos)
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito(actual ? 'Empresa actualizada.' : 'Empresa creada.');
        this.cerrar();
        this.lista.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected alternarEstado(e: Empresa): void {
    const activar = !e.activa;
    const accion = () =>
      this.servicio.cambiarEstadoEmpresa(e.id, activar).subscribe(() => {
        this.avisos.exito(activar ? 'Empresa activada.' : 'Empresa desactivada.');
        this.lista.cargar();
      });
    if (activar) {
      accion();
      return;
    }
    this.dialogos
      .confirmar({
        titulo: 'Desactivar empresa',
        mensaje: `Los usuarios de ${e.razonSocial} no podrán usar el sistema hasta que se reactive.`,
        accion: 'Desactivar',
      })
      .subscribe(accion);
  }
}
