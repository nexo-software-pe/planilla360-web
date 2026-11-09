import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { mesActual, nombreDeMes } from '../../shared/fechas';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { EmpleadosService, indexarPorId } from '../empleados/empleados.service';
import { PlanillaService, ResultadoBeneficio } from './planilla.service';

type Beneficio = 'GRATIFICACION' | 'CTS';

/** Meses en que corresponde cada beneficio (Perú): gratificación jul/dic; CTS may/nov. */
const MESES_VALIDOS: Record<Beneficio, string[]> = {
  GRATIFICACION: ['07', '12'],
  CTS: ['05', '11'],
};

/** Simulador de gratificación y CTS: se revisa el cálculo y, si es correcto, se genera la planilla. */
@Component({
  selector: 'app-beneficios',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EncabezadoPagina,
    SolesPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Gratificación y CTS"
      subtitulo="Simula el beneficio del semestre antes de generar la planilla"
    />

    <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="simular()" novalidate>
      <div class="rejilla-form">
        <mat-form-field appearance="outline">
          <mat-label>Beneficio</mat-label>
          <mat-select formControlName="tipo" required>
            <mat-option value="GRATIFICACION">Gratificación</mat-option>
            <mat-option value="CTS">CTS</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Periodo</mat-label>
          <input matInput type="month" formControlName="periodo" [max]="mesTope" required />
          <mat-hint>{{ ayudaPeriodo() }}</mat-hint>
          @if (form.controls.periodo.touched && form.controls.periodo.invalid) {
            <mat-error>{{ error(form.controls.periodo) }}</mat-error>
          }
        </mat-form-field>
      </div>
      <div class="acciones-form">
        <button mat-flat-button type="submit" [disabled]="trabajando()">Simular</button>
      </div>
    </form>

    @if (resultado(); as r) {
      <section class="tarjeta" aria-live="polite" aria-labelledby="titulo-resultado">
        <h2 id="titulo-resultado">
          Simulación de {{ r.tipo === 'CTS' ? 'CTS' : 'gratificación' }} de {{ periodoTexto() }}
        </h2>
        <ul class="cifras">
          <li>
            <strong>{{ r.trabajadores }}</strong> trabajadores
          </li>
          <li>
            Total a pagar <strong class="cifra">{{ r.totalNeto | soles }}</strong>
          </li>
          @if (r.tipo === 'GRATIFICACION') {
            <li>Incluye bonificación extraordinaria de ley</li>
          }
        </ul>
        <div class="tabla-caja">
          <table class="tabla">
            <caption class="solo-lector">
              Detalle por trabajador
            </caption>
            <thead>
              <tr>
                <th scope="col">Trabajador</th>
                <th scope="col" class="cifra">
                  {{ r.tipo === 'CTS' ? 'CTS' : 'Gratificación' }}
                </th>
                @if (r.tipo === 'GRATIFICACION') {
                  <th scope="col" class="cifra">Bonif. extraordinaria</th>
                }
                <th scope="col" class="cifra">Neto</th>
              </tr>
            </thead>
            <tbody>
              @for (l of r.lineas; track l.empleadoId) {
                <tr>
                  <td>{{ nombre(l.empleadoId) }}</td>
                  <td class="cifra">{{ (r.tipo === 'CTS' ? l.cts : l.gratificacion) | soles }}</td>
                  @if (r.tipo === 'GRATIFICACION') {
                    <td class="cifra">{{ l.bonificacionExtraordinaria | soles }}</td>
                  }
                  <td class="cifra">
                    <strong>{{ l.neto | soles }}</strong>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="button" [disabled]="trabajando()" (click)="generar(r)">
            Generar planilla
          </button>
        </div>
      </section>
    }
  `,
  styles: `
    .formulario {
      margin-bottom: 24px;
    }
    .cifras {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin: 0 0 16px;
      padding: 0;
      list-style: none;
    }
    .tabla-caja {
      margin-bottom: 8px;
    }
  `,
})
export class Beneficios {
  private readonly servicio = inject(PlanillaService);
  private readonly router = inject(Router);
  private readonly dialogos = inject(DialogosService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly mesTope = mesActual();
  protected readonly trabajando = signal(false);
  protected readonly resultado = signal<ResultadoBeneficio | null>(null);
  private readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });
  private readonly indice = computed(() => indexarPorId(this.empleados()));

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['GRATIFICACION' as Beneficio, Validators.required],
    periodo: [this.sugerirPeriodo('GRATIFICACION'), Validators.required],
  });

  protected readonly periodoTexto = computed(() => nombreDeMes(this.resultado()?.periodo ?? ''));
  private readonly tipoElegido = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });
  protected readonly ayudaPeriodo = computed(() =>
    this.tipoElegido() === 'CTS'
      ? 'Se deposita en mayo y noviembre.'
      : 'Se paga en julio y diciembre.',
  );

  constructor() {
    this.form.controls.tipo.valueChanges.subscribe((t) => {
      this.form.controls.periodo.setValue(this.sugerirPeriodo(t));
      this.resultado.set(null);
    });
  }

  /** Último mes (hasta hoy) en que corresponde el beneficio. */
  private sugerirPeriodo(tipo: Beneficio): string {
    const hoy = mesActual();
    const anio = Number(hoy.slice(0, 4));
    const candidatos = [anio, anio - 1].flatMap((a) => MESES_VALIDOS[tipo].map((m) => `${a}-${m}`));
    return (
      candidatos
        .filter((c) => c <= hoy)
        .sort()
        .reverse()[0] ?? hoy
    );
  }

  protected nombre(id: string): string {
    const e = this.indice().get(id);
    return e ? `${e.apellidos}, ${e.nombres}` : 'Trabajador';
  }

  private validarPeriodo(): boolean {
    const { tipo, periodo } = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid) return false;
    if (!MESES_VALIDOS[tipo].includes(periodo.slice(5, 7))) {
      this.form.controls.periodo.setErrors({
        servidor: `La ${tipo === 'CTS' ? 'CTS' : 'gratificación'} corresponde a ${tipo === 'CTS' ? 'mayo o noviembre' : 'julio o diciembre'}.`,
      });
      return false;
    }
    if (periodo > this.mesTope) {
      this.form.controls.periodo.setErrors({ servidor: 'No puedes trabajar un periodo futuro.' });
      return false;
    }
    return true;
  }

  protected simular(): void {
    if (!this.validarPeriodo()) return;
    const { tipo, periodo } = this.form.getRawValue();
    this.trabajando.set(true);
    this.servicio.beneficio(tipo, periodo, true).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.trabajando.set(false);
      },
      error: () => this.trabajando.set(false),
    });
  }

  protected generar(r: ResultadoBeneficio): void {
    this.dialogos
      .confirmar({
        titulo: 'Generar planilla',
        mensaje: `Se creará la planilla de ${r.tipo === 'CTS' ? 'CTS' : 'gratificación'} de ${this.periodoTexto()} por ${r.trabajadores} trabajadores.`,
        accion: 'Generar planilla',
      })
      .subscribe(() => {
        this.trabajando.set(true);
        this.servicio.beneficio(r.tipo as Beneficio, r.periodo, false).subscribe({
          next: (generada) => {
            this.trabajando.set(false);
            this.avisos.exito('Planilla generada.');
            void this.router.navigate(
              generada.id ? ['/panel/planilla', generada.id] : ['/panel/planilla'],
            );
          },
          error: () => this.trabajando.set(false),
        });
      });
  }
}
