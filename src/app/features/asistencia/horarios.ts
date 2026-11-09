import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EstadoLista } from '../../shared/estado-lista';
import { hoyIso } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { mensajeDeError } from '../../shared/validadores';
import { EmpleadosService } from '../empleados/empleados.service';
import { AsistenciaService, DIAS_SEMANA, DiaSemana, Horario } from './asistencia.service';

/** Los horarios llegan como `HH:mm:ss`; se muestran como `HH:mm`. */
const hhmm = (hora: string): string => hora.slice(0, 5);

@Component({
  selector: 'app-horarios',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EstadoLista,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barra">
      <h2>Horarios de trabajo</h2>
      @if (!creando()) {
        <button mat-flat-button type="button" (click)="creando.set(true)">Nuevo horario</button>
      }
    </div>

    @if (creando()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="crear()" novalidate>
        <h3>Nuevo horario</h3>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" required />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <mat-error>{{ error(form.controls.nombre) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hora de entrada</mat-label>
            <input matInput type="time" formControlName="entrada" required />
            @if (form.controls.entrada.touched && form.controls.entrada.invalid) {
              <mat-error>{{ error(form.controls.entrada) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hora de salida</mat-label>
            <input matInput type="time" formControlName="salida" required />
            @if (form.controls.salida.touched && form.controls.salida.invalid) {
              <mat-error>{{ error(form.controls.salida) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tolerancia (min)</mat-label>
            <input matInput type="number" min="0" formControlName="toleranciaMin" required />
            @if (form.controls.toleranciaMin.touched && form.controls.toleranciaMin.invalid) {
              <mat-error>{{ error(form.controls.toleranciaMin) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Refrigerio (min)</mat-label>
            <input matInput type="number" min="0" formControlName="refrigerioMin" />
          </mat-form-field>
        </div>
        <fieldset>
          <legend>Días laborables</legend>
          <div class="dias">
            @for (d of dias; track d.valor) {
              <mat-checkbox
                [checked]="seleccionados().includes(d.valor)"
                (change)="alternarDia(d.valor, $event.checked)"
                >{{ d.largo }}</mat-checkbox
              >
            }
          </div>
          @if (diasInvalidos()) {
            <p class="aviso aviso--error" role="alert">Elige al menos un día.</p>
          }
        </fieldset>
        @if (form.errors?.['horas']) {
          <p class="aviso aviso--error" role="alert">La salida debe ser posterior a la entrada.</p>
        }
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Guardar horario</button>
          <button mat-button type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    @if (asignando(); as h) {
      <form class="tarjeta formulario" [formGroup]="formAsignar" (ngSubmit)="asignar(h)" novalidate>
        <h3>Asignar «{{ h.nombre }}» a un empleado</h3>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Empleado</mat-label>
            <mat-select formControlName="empleadoId" required>
              @for (e of empleados(); track e.id) {
                <mat-option [value]="e.id">{{ e.apellidos }}, {{ e.nombres }}</mat-option>
              }
            </mat-select>
            @if (
              formAsignar.controls.empleadoId.touched && formAsignar.controls.empleadoId.invalid
            ) {
              <mat-error>{{ error(formAsignar.controls.empleadoId) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Vigente desde</mat-label>
            <input matInput type="date" formControlName="desde" required />
            @if (formAsignar.controls.desde.touched && formAsignar.controls.desde.invalid) {
              <mat-error>{{ error(formAsignar.controls.desde) }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Asignar</button>
          <button mat-button type="button" (click)="asignando.set(null)">Cancelar</button>
        </div>
      </form>
    }

    <section class="tabla-caja" aria-label="Horarios">
      @if (lista.datos(); as horarios) {
        @if (horarios.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Horario</th>
                <th scope="col">Entrada</th>
                <th scope="col">Salida</th>
                <th scope="col" class="cifra">Tolerancia</th>
                <th scope="col" class="cifra">Refrigerio</th>
                <th scope="col">Días</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (h of horarios; track h.id) {
                <tr>
                  <td>
                    <strong>{{ h.nombre }}</strong>
                  </td>
                  <td class="cifra">{{ hhmm(h.entrada) }}</td>
                  <td class="cifra">{{ hhmm(h.salida) }}</td>
                  <td class="cifra">{{ h.toleranciaMin }} min</td>
                  <td class="cifra">{{ h.refrigerioMin }} min</td>
                  <td>{{ diasTexto(h) }}</td>
                  <td>
                    <div class="acciones-fila">
                      <button
                        mat-stroked-button
                        type="button"
                        (click)="asignando.set(h)"
                        [attr.aria-label]="'Asignar el horario ' + h.nombre + ' a un empleado'"
                      >
                        Asignar
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
        [vacio]="lista.datos()?.length === 0"
        mensajeVacio="Aún no hay horarios. Crea el primero para controlar tardanzas."
        (reintentar)="lista.cargar()"
      />
    </section>
  `,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0;
      font-size: 18px;
    }
    h3 {
      margin: 0 0 12px;
      font-size: 16px;
    }
    .formulario {
      margin-bottom: 16px;
    }
    fieldset {
      margin: 0 0 8px;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 4px;
      font-weight: 500;
    }
    .dias {
      display: flex;
      flex-wrap: wrap;
      gap: 0 16px;
    }
  `,
})
export class Horarios {
  private readonly servicio = inject(AsistenciaService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly hhmm = hhmm;
  protected readonly dias = DIAS_SEMANA;
  protected readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });

  protected readonly creando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly asignando = signal<Horario | null>(null);
  protected readonly seleccionados = signal<DiaSemana[]>([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
  ]);
  protected readonly diasInvalidos = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      entrada: ['08:00', Validators.required],
      salida: ['17:00', Validators.required],
      toleranciaMin: [5, [Validators.required, Validators.min(0)]],
      refrigerioMin: [60, [Validators.min(0)]],
    },
    {
      validators: (g) =>
        g.get('entrada')?.value &&
        g.get('salida')?.value &&
        g.get('salida')!.value <= g.get('entrada')!.value
          ? { horas: true }
          : null,
    },
  );

  protected readonly formAsignar = this.fb.nonNullable.group({
    empleadoId: ['', Validators.required],
    desde: [hoyIso(), Validators.required],
  });

  protected readonly lista = recurso(() => this.servicio.horarios());

  constructor() {
    this.lista.cargar();
  }

  protected diasTexto(h: Horario): string {
    return DIAS_SEMANA.filter((d) => h.dias.includes(d.valor))
      .map((d) => d.corto)
      .join(', ');
  }

  protected alternarDia(dia: DiaSemana, marcado: boolean): void {
    this.seleccionados.update((actuales) =>
      marcado ? [...actuales, dia] : actuales.filter((d) => d !== dia),
    );
    this.diasInvalidos.set(false);
  }

  protected cancelar(): void {
    this.creando.set(false);
    this.diasInvalidos.set(false);
    this.form.reset({ entrada: '08:00', salida: '17:00', toleranciaMin: 5, refrigerioMin: 60 });
  }

  protected crear(): void {
    this.form.markAllAsTouched();
    this.diasInvalidos.set(this.seleccionados().length === 0);
    if (this.form.invalid || this.seleccionados().length === 0) return;
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.servicio
      .crearHorario({
        nombre: v.nombre.trim(),
        entrada: v.entrada,
        salida: v.salida,
        toleranciaMin: v.toleranciaMin,
        refrigerioMin: v.refrigerioMin ?? 0,
        dias: DIAS_SEMANA.filter((d) => this.seleccionados().includes(d.valor)).map((d) => d.valor),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisos.exito('Horario creado.');
          this.cancelar();
          this.lista.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected asignar(h: Horario): void {
    this.formAsignar.markAllAsTouched();
    if (this.formAsignar.invalid) return;
    const v = this.formAsignar.getRawValue();
    this.guardando.set(true);
    this.servicio.asignarHorario(h.id, v.empleadoId, v.desde).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito('Horario asignado.');
        this.asignando.set(null);
        this.formAsignar.reset({ desde: hoyIso() });
      },
      error: () => this.guardando.set(false),
    });
  }
}
