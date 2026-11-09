import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EstadoLista } from '../../shared/estado-lista';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyIso } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { mensajeDeError, noFuturaValidator } from '../../shared/validadores';
import { EmpleadosService, FamiliarRequest, Parentesco } from './empleados.service';

const PARENTESCOS: Record<Parentesco, string> = {
  HIJO: 'Hijo/a',
  CONYUGE: 'Cónyuge',
  CONVIVIENTE: 'Conviviente',
  PADRE: 'Padre',
  MADRE: 'Madre',
};

@Component({
  selector: 'app-ficha-familiares',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EstadoLista,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barra">
      <h2>Familiares</h2>
      @if (!formulario()) {
        <button mat-flat-button type="button" (click)="formulario.set(true)">
          Agregar familiar
        </button>
      }
    </div>

    @if (formulario()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Nombres</mat-label>
            <input matInput formControlName="nombres" required />
            @if (form.controls.nombres.touched && form.controls.nombres.invalid) {
              <mat-error>{{ error(form.controls.nombres) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Parentesco</mat-label>
            <mat-select formControlName="parentesco" required>
              @for (p of parentescos; track p.valor) {
                <mat-option [value]="p.valor">{{ p.texto }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fecha de nacimiento</mat-label>
            <input matInput type="date" formControlName="fechaNacimiento" required />
            @if (form.controls.fechaNacimiento.touched && form.controls.fechaNacimiento.invalid) {
              <mat-error>{{ error(form.controls.fechaNacimiento) }}</mat-error>
            }
          </mat-form-field>
        </div>
        <mat-checkbox formControlName="estudia">Estudia (para la asignación familiar)</mat-checkbox>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Guardar familiar</button>
          <button mat-button type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    <section class="tabla-caja" aria-label="Familiares del empleado">
      @if (lista.datos(); as familiares) {
        @if (familiares.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Nombres</th>
                <th scope="col">Parentesco</th>
                <th scope="col">Nacimiento</th>
                <th scope="col">Estudia</th>
              </tr>
            </thead>
            <tbody>
              @for (f of familiares; track f.id) {
                <tr>
                  <td>{{ f.nombres }}</td>
                  <td>{{ parentesco(f.parentesco) }}</td>
                  <td>{{ f.fechaNacimiento | fecha }}</td>
                  <td>{{ f.estudia ? 'Sí' : 'No' }}</td>
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
        mensajeVacio="No hay familiares registrados."
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
    .formulario {
      margin-bottom: 16px;
    }
  `,
})
export class FichaFamiliares {
  readonly empleadoId = input.required<string>();

  private readonly servicio = inject(EmpleadosService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly formulario = signal(false);
  protected readonly guardando = signal(false);
  protected readonly parentescos = Object.entries(PARENTESCOS).map(([valor, texto]) => ({
    valor,
    texto,
  }));

  protected readonly form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(150)]],
    parentesco: ['HIJO' as Parentesco, Validators.required],
    fechaNacimiento: ['', [Validators.required, noFuturaValidator(hoyIso)]],
    estudia: [false],
  });

  protected readonly lista = recurso(() => this.servicio.familiares(this.empleadoId()));

  constructor() {
    queueMicrotask(() => this.lista.cargar());
  }

  protected parentesco(p: Parentesco): string {
    return PARENTESCOS[p];
  }

  protected cancelar(): void {
    this.formulario.set(false);
    this.form.reset();
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const datos: FamiliarRequest = this.form.getRawValue();
    this.guardando.set(true);
    this.servicio
      .crearFamiliar(this.empleadoId(), { ...datos, nombres: datos.nombres.trim() })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisos.exito('Familiar agregado.');
          this.cancelar();
          this.lista.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }
}
