import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Rol } from '../../core/auth/auth.models';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_ACTIVO, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { formatearFechaHora } from '../../shared/fechas';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { mensajeDeError, passwordValidator } from '../../shared/validadores';
import { EmpleadosService } from '../empleados/empleados.service';
import { AdminService, ROL_TEXTO, UsuarioAdmin } from './admin.service';

const ROLES_ASIGNABLES: Rol[] = ['ADMIN_EMPRESA', 'RRHH', 'EMPLEADO'];

@Component({
  selector: 'app-usuarios',
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Usuarios"
      subtitulo="Quién puede entrar al sistema y con qué rol"
    >
      @if (!formulario()) {
        <button mat-flat-button type="button" (click)="nuevo()">Nuevo usuario</button>
      }
    </app-encabezado-pagina>

    @if (formulario()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2>{{ editando() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" required />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <mat-error>{{ error(form.controls.nombre) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="off" required />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <mat-error>{{ error(form.controls.email) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="rol" required>
              @for (r of roles; track r.valor) {
                <mat-option [value]="r.valor">{{ r.texto }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Empleado vinculado</mat-label>
            <mat-select formControlName="empleadoId">
              <mat-option value="">Ninguno</mat-option>
              @for (e of empleados(); track e.id) {
                <mat-option [value]="e.id">{{ e.apellidos }}, {{ e.nombres }}</mat-option>
              }
            </mat-select>
            <mat-hint>Necesario para que el usuario use el portal del empleado.</mat-hint>
          </mat-form-field>
          @if (!editando()) {
            <mat-form-field appearance="outline">
              <mat-label>Contraseña inicial</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
                required
              />
              <mat-hint>Mínimo 10 caracteres, con letras y números.</mat-hint>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>{{ error(form.controls.password) }}</mat-error>
              }
            </mat-form-field>
          }
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">
            {{ editando() ? 'Guardar cambios' : 'Crear usuario' }}
          </button>
          <button mat-button type="button" (click)="cerrar()">Cancelar</button>
        </div>
      </form>
    }

    <section class="tabla-caja" aria-label="Usuarios">
      @if (lista.datos(); as p) {
        @if (p.contenido.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Último acceso</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of p.contenido; track u.id) {
                <tr>
                  <td>
                    <strong>{{ u.nombre }}</strong>
                  </td>
                  <td>{{ u.email }}</td>
                  <td>{{ rolTexto(u.rol) }}</td>
                  <td>{{ ultimoAcceso(u) }}</td>
                  <td>
                    <app-etiqueta [texto]="visual(u).texto" [tono]="visual(u).tono" />
                  </td>
                  <td>
                    <div class="acciones-fila">
                      <button
                        mat-button
                        type="button"
                        (click)="editar(u)"
                        [attr.aria-label]="'Editar a ' + u.nombre"
                      >
                        Editar
                      </button>
                      <button
                        mat-button
                        type="button"
                        (click)="restablecer(u)"
                        [attr.aria-label]="'Restablecer contraseña de ' + u.nombre"
                      >
                        Restablecer clave
                      </button>
                      <button
                        mat-button
                        type="button"
                        (click)="alternarEstado(u)"
                        [attr.aria-label]="(u.activo ? 'Desactivar a ' : 'Activar a ') + u.nombre"
                      >
                        {{ u.activo ? 'Desactivar' : 'Activar' }}
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
        mensajeVacio="Aún no hay usuarios."
        (reintentar)="lista.cargar()"
      />
      <mat-paginator
        showFirstLastButtons
        [length]="lista.datos()?.totalElementos ?? 0"
        [pageIndex]="pagina()"
        [pageSize]="tamano()"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="cambiarPagina($event)"
        aria-label="Paginación de usuarios"
      />
    </section>
  `,
  styles: `
    .formulario {
      margin-bottom: 24px;
    }
  `,
})
export class Usuarios {
  private readonly servicio = inject(AdminService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly roles = ROLES_ASIGNABLES.map((valor) => ({ valor, texto: ROL_TEXTO[valor] }));
  protected readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });

  protected readonly pagina = signal(0);
  protected readonly tamano = signal(20);
  protected readonly formulario = signal(false);
  protected readonly editando = signal<UsuarioAdmin | null>(null);
  protected readonly guardando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    rol: ['RRHH' as Rol, Validators.required],
    empleadoId: [''],
    password: ['', [Validators.required, passwordValidator]],
  });

  protected readonly lista = recurso<Pagina<UsuarioAdmin>>(() =>
    this.servicio.usuarios(this.pagina(), this.tamano()),
  );
  protected readonly total = computed(() => this.lista.datos()?.totalElementos ?? 0);

  constructor() {
    this.lista.cargar();
  }

  protected rolTexto(r: Rol): string {
    return ROL_TEXTO[r];
  }

  protected visual(u: UsuarioAdmin) {
    return estadoVisual(ESTADO_ACTIVO, u.activo);
  }

  protected ultimoAcceso(u: UsuarioAdmin): string {
    return formatearFechaHora(u.ultimoAcceso) || 'Nunca';
  }

  protected cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.tamano.set(e.pageSize);
    this.lista.cargar();
  }

  protected nuevo(): void {
    this.editando.set(null);
    this.form.reset({ rol: 'RRHH' });
    this.form.controls.password.enable();
    this.form.controls.email.enable();
    this.formulario.set(true);
  }

  protected editar(u: UsuarioAdmin): void {
    this.editando.set(u);
    this.form.reset({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      empleadoId: u.empleadoId ?? '',
      password: '',
    });
    // el correo y la contraseña no se cambian aquí
    this.form.controls.password.disable();
    this.form.controls.email.disable();
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
    const empleadoId = v.empleadoId || null;
    const actual = this.editando();
    this.guardando.set(true);
    const peticion$ = actual
      ? this.servicio.actualizarUsuario(actual.id, {
          nombre: v.nombre.trim(),
          rol: v.rol,
          empleadoId,
        })
      : this.servicio.crearUsuario({
          nombre: v.nombre.trim(),
          email: v.email.trim(),
          password: v.password,
          rol: v.rol,
          empleadoId,
        });
    peticion$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito(actual ? 'Usuario actualizado.' : 'Usuario creado.');
        this.cerrar();
        this.lista.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected alternarEstado(u: UsuarioAdmin): void {
    const activar = !u.activo;
    const accion = () =>
      this.servicio.cambiarEstadoUsuario(u.id, activar).subscribe(() => {
        this.avisos.exito(activar ? 'Usuario activado.' : 'Usuario desactivado.');
        this.lista.cargar();
      });
    if (activar) {
      accion();
      return;
    }
    this.dialogos
      .confirmar({
        titulo: 'Desactivar usuario',
        mensaje: `${u.nombre} ya no podrá iniciar sesión. Puedes volver a activarlo cuando quieras.`,
        accion: 'Desactivar',
      })
      .subscribe(accion);
  }

  protected restablecer(u: UsuarioAdmin): void {
    this.dialogos
      .pedirTexto({
        titulo: `Restablecer contraseña de ${u.nombre}`,
        etiqueta: 'Contraseña nueva',
        accion: 'Restablecer',
        tipo: 'password',
        ayuda: 'Mínimo 10 caracteres, con letras y números.',
      })
      .subscribe((clave) =>
        this.servicio
          .restablecerPassword(u.id, clave)
          .subscribe(() => this.avisos.exito('Contraseña restablecida.')),
      );
  }
}
