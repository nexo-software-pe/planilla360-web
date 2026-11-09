import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyIso } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { mensajeDeError } from '../../shared/validadores';
import { CatalogoService } from '../catalogo/catalogo.service';
import { AdminService, ParametroLegal } from '../admin/admin.service';

/** Valor con coma decimal, como el resto de cifras de la interfaz. */
function formatearValor(valor: number): string {
  return String(Number(valor.toFixed(4))).replace('.', ',');
}

@Component({
  selector: 'app-parametros-legales',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Parámetros legales"
      subtitulo="Valores globales (UIT, RMV, tasas) y comisiones de las AFP, con su vigencia"
    >
      @if (!formulario()) {
        <button mat-flat-button type="button" (click)="formulario.set(true)">
          Nuevo valor vigente
        </button>
      }
    </app-encabezado-pagina>

    @if (formulario()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2>Nuevo valor vigente</h2>
        <p class="aviso aviso--info">
          El nuevo valor reemplaza al anterior desde la fecha indicada; el anterior queda en el
          historial y las planillas ya cerradas no cambian.
        </p>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Código</mat-label>
            <input matInput formControlName="codigo" placeholder="UIT" required />
            <mat-hint>Mayúsculas, números y guion bajo.</mat-hint>
            @if (form.controls.codigo.touched && form.controls.codigo.invalid) {
              <mat-error>{{ error(form.controls.codigo) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="descripcion" required />
            @if (form.controls.descripcion.touched && form.controls.descripcion.invalid) {
              <mat-error>{{ error(form.controls.descripcion) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Valor</mat-label>
            <input matInput type="number" step="any" formControlName="valor" required />
            @if (form.controls.valor.touched && form.controls.valor.invalid) {
              <mat-error>{{ error(form.controls.valor) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Vigente desde</mat-label>
            <input matInput type="date" formControlName="vigenteDesde" required />
            @if (form.controls.vigenteDesde.touched && form.controls.vigenteDesde.invalid) {
              <mat-error>{{ error(form.controls.vigenteDesde) }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Guardar</button>
          <button mat-button type="button" (click)="cerrar()">Cancelar</button>
        </div>
      </form>
    }

    @if (datos.datos(); as d) {
      <div class="pila">
        <section>
          <h2>Parámetros</h2>
          <div class="tabla-caja">
            @if (d.parametros.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Descripción</th>
                    <th scope="col" class="cifra">Valor</th>
                    <th scope="col">Vigente desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col">Situación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of d.parametros; track p.id) {
                    <tr>
                      <td>
                        <strong>{{ p.codigo }}</strong>
                      </td>
                      <td>{{ p.descripcion }}</td>
                      <td class="cifra">{{ valor(p) }}</td>
                      <td>{{ p.vigenteDesde | fecha }}</td>
                      <td>{{ p.vigenteHasta ? (p.vigenteHasta | fecha) : '—' }}</td>
                      <td>
                        <app-etiqueta
                          [texto]="p.vigenteHasta ? 'Histórico' : 'Vigente'"
                          [tono]="p.vigenteHasta ? 'neutro' : 'exito'"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </section>

        <section>
          <h2>AFP</h2>
          <div class="tabla-caja">
            @if (d.afps.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">AFP</th>
                    <th scope="col" class="cifra">Comisión sobre flujo</th>
                    <th scope="col" class="cifra">Comisión mixta</th>
                    <th scope="col">Vigente desde</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of d.afps; track a.id) {
                    <tr>
                      <td>
                        <strong>{{ a.nombre }}</strong>
                      </td>
                      <td class="cifra">{{ porcentaje(a.comisionFlujo) }}</td>
                      <td class="cifra">{{ porcentaje(a.comisionMixta) }}</td>
                      <td>{{ a.vigenteDesde | fecha }}</td>
                    </tr>
                  }
                </tbody>
              </table>
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
    .formulario {
      margin-bottom: 24px;
    }
    .formulario h2 {
      margin-bottom: 12px;
    }
  `,
})
export class ParametrosLegales {
  private readonly servicio = inject(AdminService);
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly formulario = signal(false);
  protected readonly guardando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]{2,60}$/)]],
    descripcion: ['', [Validators.required, Validators.maxLength(200)]],
    valor: [null as number | null, Validators.required],
    vigenteDesde: [hoyIso(), Validators.required],
  });

  protected readonly datos = recurso(() =>
    forkJoin({ parametros: this.servicio.parametrosLegales(), afps: this.catalogo.afps() }),
  );

  constructor() {
    this.datos.cargar();
  }

  protected valor(p: ParametroLegal): string {
    return formatearValor(p.valor);
  }

  protected porcentaje(v: number): string {
    return `${formatearValor(v)} %`;
  }

  protected cerrar(): void {
    this.formulario.set(false);
    this.form.reset({ vigenteDesde: hoyIso() });
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.servicio
      .crearParametroLegal({
        codigo: v.codigo.trim(),
        descripcion: v.descripcion.trim(),
        valor: Number(v.valor),
        vigenteDesde: v.vigenteDesde,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisos.exito('Parámetro registrado.');
          this.cerrar();
          this.datos.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }
}
