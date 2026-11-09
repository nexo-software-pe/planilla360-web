import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { descargarBlob } from '../../shared/descarga';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { formatearMinutos, mesActual } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { forkJoin } from 'rxjs';
import { CostoLaboral, PlanillaService, TipoPlanilla } from './planilla.service';

@Component({
  selector: 'app-reportes',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EncabezadoPagina,
    EstadoLista,
    SolesPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Reportes"
      subtitulo="Costo laboral, tardanzas y planilla en Excel"
    />

    <form class="filtros" [formGroup]="form" (ngSubmit)="consultar()" novalidate>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Periodo</mat-label>
        <input matInput type="month" formControlName="periodo" [max]="mesTope" required />
        @if (form.controls.periodo.touched && form.controls.periodo.invalid) {
          <mat-error>{{ error(form.controls.periodo) }}</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Tipo de planilla (Excel)</mat-label>
        <mat-select formControlName="tipo">
          <mat-option value="MENSUAL">Mensual</mat-option>
          <mat-option value="GRATIFICACION">Gratificación</mat-option>
          <mat-option value="CTS">CTS</mat-option>
        </mat-select>
      </mat-form-field>
      <button mat-flat-button type="submit">Ver reportes</button>
      <button mat-stroked-button type="button" [disabled]="descargando()" (click)="descargar()">
        Descargar planilla en Excel
      </button>
    </form>

    @if (datos.datos(); as d) {
      <div class="pila">
        <section aria-labelledby="titulo-costo">
          <h2 id="titulo-costo">Costo laboral por área</h2>
          <div class="tabla-caja">
            @if (d.costo.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Área</th>
                    <th scope="col">Cargo</th>
                    <th scope="col" class="cifra">Trabajadores</th>
                    <th scope="col" class="cifra">Ingresos</th>
                    <th scope="col" class="cifra">EsSalud</th>
                    <th scope="col" class="cifra">Costo total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of d.costo; track $index) {
                    <tr [class.subtotal]="c.nivel !== 'CARGO'">
                      <td>{{ etiquetaArea(c) }}</td>
                      <td>{{ c.cargo || '' }}</td>
                      <td class="cifra">{{ c.trabajadores }}</td>
                      <td class="cifra">{{ c.ingresos | soles }}</td>
                      <td class="cifra">{{ c.essalud | soles }}</td>
                      <td class="cifra">
                        <strong>{{ c.costoTotal | soles }}</strong>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">No hay planilla cerrada en este periodo.</p>
            }
          </div>
        </section>

        <section aria-labelledby="titulo-tardanzas">
          <h2 id="titulo-tardanzas">Mayores tardanzas por área</h2>
          <div class="tabla-caja">
            @if (d.tardanzas.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Área</th>
                    <th scope="col" class="cifra">Puesto</th>
                    <th scope="col">Trabajador</th>
                    <th scope="col" class="cifra">Días</th>
                    <th scope="col" class="cifra">Tiempo total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of d.tardanzas; track $index) {
                    <tr>
                      <td>{{ t.area }}</td>
                      <td class="cifra">{{ t.posicion }}</td>
                      <td>{{ t.trabajador }}</td>
                      <td class="cifra">{{ t.dias }}</td>
                      <td class="cifra">{{ minutos(t.minutos) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">No hay tardanzas registradas en este periodo.</p>
            }
          </div>
        </section>
      </div>
    }
    <app-estado-lista
      [cargando]="datos.cargando() && !datos.datos()"
      [error]="datos.error()"
      (reintentar)="datos.cargar()"
    />
  `,
  styles: `
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .vacio {
      margin: 0;
      padding: 24px 16px;
      text-align: center;
      color: var(--color-texto-secundario);
    }
    tr.subtotal td {
      background: #f7f8fa;
    }
  `,
})
export class Reportes {
  private readonly servicio = inject(PlanillaService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly mesTope = mesActual();
  protected readonly minutos = formatearMinutos;
  protected readonly descargando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    periodo: [mesActual(), Validators.required],
    tipo: ['MENSUAL' as TipoPlanilla],
  });

  protected readonly datos = recurso(() => {
    const periodo = this.form.controls.periodo.value;
    return forkJoin({
      costo: this.servicio.costoLaboral(periodo),
      tardanzas: this.servicio.tardanzasPorArea(periodo, 3),
    });
  });

  constructor() {
    this.datos.cargar();
  }

  protected consultar(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) this.datos.cargar();
  }

  protected etiquetaArea(c: CostoLaboral): string {
    if (c.nivel === 'CARGO') return c.area ?? '';
    return c.area ? `Subtotal ${c.area}` : 'Total general';
  }

  protected descargar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { periodo, tipo } = this.form.getRawValue();
    this.descargando.set(true);
    this.servicio.planillaMensualXlsx(periodo, tipo).subscribe({
      next: (blob) => {
        this.descargando.set(false);
        descargarBlob(blob, `planilla-${tipo.toLowerCase()}-${periodo}.xlsx`);
      },
      error: () => this.descargando.set(false),
    });
  }
}
