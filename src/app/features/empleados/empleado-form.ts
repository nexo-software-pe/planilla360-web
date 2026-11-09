import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { hoyIso } from '../../shared/fechas';
import {
  dniValidator,
  mensajeDeError,
  noFuturaValidator,
  telefonoValidator,
} from '../../shared/validadores';
import { CatalogoService } from '../catalogo/catalogo.service';
import { Empleado, EmpleadoRequest, EmpleadosService } from './empleados.service';

/** Alta y edición de empleados (`/panel/empleados/nuevo` y `/panel/empleados/:id/editar`). */
@Component({
  selector: 'app-empleado-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EncabezadoPagina,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      [titulo]="id() ? 'Editar empleado' : 'Nuevo empleado'"
      subtitulo="Los datos del contrato se registran en la ficha, después de crear al empleado."
    />

    <form class="tarjeta" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (errorGeneral(); as e) {
        <p class="aviso aviso--error" role="alert">{{ e }}</p>
      }
      <h2>Datos personales</h2>
      <div class="rejilla-form">
        <mat-form-field appearance="outline">
          <mat-label>DNI</mat-label>
          <input matInput formControlName="dni" inputmode="numeric" maxlength="8" required />
          @if (form.controls.dni.touched && form.controls.dni.invalid) {
            <mat-error>{{ error(form.controls.dni) }}</mat-error>
          }
        </mat-form-field>
        <div class="consulta-dni">
          <button
            mat-stroked-button
            type="button"
            (click)="consultarDni()"
            [disabled]="
              form.controls.dni.invalid || form.controls.dni.value === '' || consultando()
            "
          >
            Completar nombres con el DNI
          </button>
        </div>
      </div>
      <div class="rejilla-form">
        <mat-form-field appearance="outline">
          <mat-label>Nombres</mat-label>
          <input matInput formControlName="nombres" required />
          @if (form.controls.nombres.touched && form.controls.nombres.invalid) {
            <mat-error>{{ error(form.controls.nombres) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Apellidos</mat-label>
          <input matInput formControlName="apellidos" required />
          @if (form.controls.apellidos.touched && form.controls.apellidos.invalid) {
            <mat-error>{{ error(form.controls.apellidos) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha de nacimiento</mat-label>
          <input matInput type="date" formControlName="fechaNacimiento" required />
          @if (form.controls.fechaNacimiento.touched && form.controls.fechaNacimiento.invalid) {
            <mat-error>{{ error(form.controls.fechaNacimiento) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="off" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <mat-error>{{ error(form.controls.email) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput type="tel" formControlName="telefono" />
          @if (form.controls.telefono.touched && form.controls.telefono.invalid) {
            <mat-error>{{ error(form.controls.telefono) }}</mat-error>
          }
        </mat-form-field>
      </div>

      <h2>Puesto</h2>
      <div class="rejilla-form">
        <mat-form-field appearance="outline">
          <mat-label>Fecha de ingreso</mat-label>
          <input matInput type="date" formControlName="fechaIngreso" required />
          @if (form.controls.fechaIngreso.touched && form.controls.fechaIngreso.invalid) {
            <mat-error>{{ error(form.controls.fechaIngreso) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Área</mat-label>
          <mat-select formControlName="areaId" required>
            @for (a of areas(); track a.id) {
              <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
            }
          </mat-select>
          @if (form.controls.areaId.touched && form.controls.areaId.invalid) {
            <mat-error>{{ error(form.controls.areaId) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cargo</mat-label>
          <mat-select formControlName="cargoId" required>
            @for (c of cargosDelArea(); track c.id) {
              <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
            }
          </mat-select>
          @if (!form.controls.areaId.value) {
            <mat-hint>Elige primero el área.</mat-hint>
          }
          @if (form.controls.cargoId.touched && form.controls.cargoId.invalid) {
            <mat-error>{{ error(form.controls.cargoId) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Jefe directo</mat-label>
          <mat-select formControlName="jefeId">
            <mat-option value="">Sin jefe</mat-option>
            @for (j of posiblesJefes(); track j.id) {
              <mat-option [value]="j.id">{{ j.apellidos }}, {{ j.nombres }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="acciones-form">
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ id() ? 'Guardar cambios' : 'Crear empleado' }}
        </button>
        <a mat-button [routerLink]="id() ? ['/panel/empleados', id()] : ['/panel/empleados']"
          >Cancelar</a
        >
      </div>
    </form>
  `,
  styles: `
    h2:not(:first-of-type) {
      margin-top: 16px;
    }
    .consulta-dni {
      display: flex;
      align-items: flex-start;
      padding-top: 6px;
    }
  `,
})
export class EmpleadoForm implements OnInit {
  /** Parámetro de ruta (`withComponentInputBinding`): ausente al crear. */
  readonly id = input<string>();

  private readonly servicio = inject(EmpleadosService);
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly guardando = signal(false);
  protected readonly consultando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, dniValidator]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    fechaNacimiento: ['', [Validators.required, noFuturaValidator(hoyIso)]],
    email: ['', [Validators.email, Validators.maxLength(160)]],
    telefono: ['', [telefonoValidator, Validators.maxLength(20)]],
    fechaIngreso: ['', [Validators.required]],
    areaId: ['', [Validators.required]],
    cargoId: ['', [Validators.required]],
    jefeId: [''],
  });

  protected readonly areas = toSignal(this.catalogo.areas(), { initialValue: [] });
  private readonly cargos = toSignal(this.catalogo.cargos(), { initialValue: [] });
  private readonly directorio = toSignal(this.servicio.directorio(), { initialValue: [] });
  private readonly areaElegida = toSignal(
    this.form.controls.areaId.valueChanges.pipe(startWith(this.form.controls.areaId.value)),
    { requireSync: true },
  );

  protected readonly cargosDelArea = computed(() =>
    this.cargos().filter((c) => c.areaId === this.areaElegida()),
  );
  protected readonly posiblesJefes = computed(() =>
    this.directorio().filter((e) => e.estado !== 'CESADO' && e.id !== this.id()),
  );

  constructor() {
    this.form.controls.areaId.valueChanges.subscribe(() => {
      const cargo = this.cargos().find((c) => c.id === this.form.controls.cargoId.value);
      if (cargo && cargo.areaId !== this.form.controls.areaId.value) {
        this.form.controls.cargoId.setValue('');
      }
    });
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.servicio.obtener(id).subscribe((e) => this.cargar(e));
  }

  private cargar(e: Empleado): void {
    this.form.setValue({
      dni: e.dni,
      nombres: e.nombres,
      apellidos: e.apellidos,
      fechaNacimiento: e.fechaNacimiento,
      email: e.email ?? '',
      telefono: e.telefono ?? '',
      fechaIngreso: e.fechaIngreso,
      areaId: e.areaId,
      cargoId: e.cargoId,
      jefeId: e.jefeId ?? '',
    });
  }

  protected consultarDni(): void {
    this.consultando.set(true);
    this.servicio.consultarDni(this.form.controls.dni.value).subscribe({
      next: (p) => {
        this.form.patchValue({
          nombres: p.nombres,
          apellidos: `${p.apellidoPaterno} ${p.apellidoMaterno}`.trim(),
        });
        this.consultando.set(false);
      },
      error: () => this.consultando.set(false),
    });
  }

  protected guardar(): void {
    this.errorGeneral.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const datos: EmpleadoRequest = {
      dni: v.dni.trim(),
      nombres: v.nombres.trim(),
      apellidos: v.apellidos.trim(),
      fechaNacimiento: v.fechaNacimiento,
      email: v.email.trim() || null,
      telefono: v.telefono.trim() || null,
      fechaIngreso: v.fechaIngreso,
      areaId: v.areaId,
      cargoId: v.cargoId,
      jefeId: v.jefeId || null,
    };
    this.guardando.set(true);
    const id = this.id();
    const peticion$ = id ? this.servicio.actualizar(id, datos) : this.servicio.crear(datos);
    peticion$.subscribe({
      next: (e) => {
        this.guardando.set(false);
        this.avisos.exito(
          id ? 'Cambios guardados.' : 'Empleado creado. Registra ahora su contrato.',
        );
        void this.router.navigate(['/panel/empleados', e.id], {
          queryParams: id ? {} : { pestana: 'contratos' },
        });
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.mostrarError(e);
      },
    });
  }

  /** Errores de validación del servidor sobre el campo que corresponde; el resto, arriba. */
  private mostrarError(e: unknown): void {
    if (!(e instanceof ApiError)) return;
    const sinCampo: string[] = [];
    for (const err of e.errores) {
      const control = this.form.get(err.campo);
      if (control) {
        control.setErrors({ servidor: err.mensaje });
        control.markAsTouched();
      } else {
        sinCampo.push(err.mensaje);
      }
    }
    this.errorGeneral.set(sinCampo.length > 0 ? sinCampo.join(' ') : e.mensaje);
  }
}
