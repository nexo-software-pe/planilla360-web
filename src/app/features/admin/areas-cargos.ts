import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { Area, CatalogoService, Cargo } from '../catalogo/catalogo.service';

@Component({
  selector: 'app-areas-cargos',
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
      titulo="Áreas y cargos"
      subtitulo="Estructura de la empresa: cada cargo pertenece a un área"
    />

    @if (datos.datos(); as d) {
      <div class="dos-columnas">
        <section aria-labelledby="titulo-areas">
          <div class="barra">
            <h2 id="titulo-areas">Áreas</h2>
            @if (!formArea()) {
              <button mat-flat-button type="button" (click)="nuevaArea()">Nueva área</button>
            }
          </div>
          @if (formArea()) {
            <form
              class="tarjeta formulario"
              [formGroup]="areaForm"
              (ngSubmit)="guardarArea()"
              novalidate
            >
              <mat-form-field appearance="outline">
                <mat-label>Nombre del área</mat-label>
                <input matInput formControlName="nombre" required />
                @if (areaForm.controls.nombre.touched && areaForm.controls.nombre.invalid) {
                  <mat-error>{{ error(areaForm.controls.nombre) }}</mat-error>
                }
              </mat-form-field>
              <div class="acciones-form">
                <button mat-flat-button type="submit" [disabled]="guardando()">Guardar</button>
                <button mat-button type="button" (click)="formArea.set(false)">Cancelar</button>
              </div>
            </form>
          }
          <div class="tabla-caja">
            @if (d.areas.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col" class="cifra">Cargos</th>
                    <th scope="col"><span class="solo-lector">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of d.areas; track a.id) {
                    <tr>
                      <td>
                        <strong>{{ a.nombre }}</strong>
                      </td>
                      <td class="cifra">{{ cantidadCargos(a.id) }}</td>
                      <td>
                        <div class="acciones-fila">
                          <button
                            mat-button
                            type="button"
                            (click)="editarArea(a)"
                            [attr.aria-label]="'Editar el área ' + a.nombre"
                          >
                            Editar
                          </button>
                          <button
                            mat-button
                            type="button"
                            (click)="eliminarArea(a)"
                            [attr.aria-label]="'Eliminar el área ' + a.nombre"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">Aún no hay áreas.</p>
            }
          </div>
        </section>

        <section aria-labelledby="titulo-cargos">
          <div class="barra">
            <h2 id="titulo-cargos">Cargos</h2>
            @if (!formCargo() && d.areas.length > 0) {
              <button mat-flat-button type="button" (click)="nuevoCargo()">Nuevo cargo</button>
            }
          </div>
          @if (formCargo()) {
            <form
              class="tarjeta formulario"
              [formGroup]="cargoForm"
              (ngSubmit)="guardarCargo()"
              novalidate
            >
              <mat-form-field appearance="outline">
                <mat-label>Nombre del cargo</mat-label>
                <input matInput formControlName="nombre" required />
                @if (cargoForm.controls.nombre.touched && cargoForm.controls.nombre.invalid) {
                  <mat-error>{{ error(cargoForm.controls.nombre) }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Área</mat-label>
                <mat-select formControlName="areaId" required>
                  @for (a of d.areas; track a.id) {
                    <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
                  }
                </mat-select>
                @if (cargoForm.controls.areaId.touched && cargoForm.controls.areaId.invalid) {
                  <mat-error>{{ error(cargoForm.controls.areaId) }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Sueldo referencial (S/)</mat-label>
                <input
                  matInput
                  type="number"
                  step="0.01"
                  min="0"
                  formControlName="sueldoReferencial"
                  required
                />
                @if (
                  cargoForm.controls.sueldoReferencial.touched &&
                  cargoForm.controls.sueldoReferencial.invalid
                ) {
                  <mat-error>{{ error(cargoForm.controls.sueldoReferencial) }}</mat-error>
                }
              </mat-form-field>
              <div class="acciones-form">
                <button mat-flat-button type="submit" [disabled]="guardando()">Guardar</button>
                <button mat-button type="button" (click)="formCargo.set(false)">Cancelar</button>
              </div>
            </form>
          }
          <div class="tabla-caja">
            @if (d.cargos.length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Cargo</th>
                    <th scope="col">Área</th>
                    <th scope="col" class="cifra">Sueldo referencial</th>
                    <th scope="col"><span class="solo-lector">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of d.cargos; track c.id) {
                    <tr>
                      <td>
                        <strong>{{ c.nombre }}</strong>
                      </td>
                      <td>{{ nombreArea(c.areaId) }}</td>
                      <td class="cifra">{{ c.sueldoReferencial | soles }}</td>
                      <td>
                        <div class="acciones-fila">
                          <button
                            mat-button
                            type="button"
                            (click)="editarCargo(c)"
                            [attr.aria-label]="'Editar el cargo ' + c.nombre"
                          >
                            Editar
                          </button>
                          <button
                            mat-button
                            type="button"
                            (click)="eliminarCargo(c)"
                            [attr.aria-label]="'Eliminar el cargo ' + c.nombre"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="vacio">Aún no hay cargos.</p>
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
    .dos-columnas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
      gap: 24px;
      align-items: start;
    }
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0;
      font-size: 18px;
    }
    .formulario {
      margin-bottom: 16px;
    }
    .formulario mat-form-field {
      width: 100%;
    }
    .vacio {
      margin: 0;
      padding: 24px 16px;
      text-align: center;
      color: var(--color-texto-secundario);
    }
  `,
})
export class AreasCargos {
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly guardando = signal(false);
  protected readonly formArea = signal(false);
  protected readonly formCargo = signal(false);
  private readonly areaEditada = signal<Area | null>(null);
  private readonly cargoEditado = signal<Cargo | null>(null);

  protected readonly areaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
  });
  protected readonly cargoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    areaId: ['', Validators.required],
    sueldoReferencial: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  protected readonly datos = recurso(() => {
    this.catalogo.olvidar();
    return forkJoin({ areas: this.catalogo.areas(), cargos: this.catalogo.cargos() });
  });
  private readonly areas = computed(() => this.datos.datos()?.areas ?? []);
  private readonly cargos = computed(() => this.datos.datos()?.cargos ?? []);

  constructor() {
    this.datos.cargar();
  }

  protected nombreArea(id: string): string {
    return this.areas().find((a) => a.id === id)?.nombre ?? '—';
  }

  protected cantidadCargos(areaId: string): number {
    return this.cargos().filter((c) => c.areaId === areaId).length;
  }

  protected nuevaArea(): void {
    this.areaEditada.set(null);
    this.areaForm.reset();
    this.formArea.set(true);
  }

  protected editarArea(a: Area): void {
    this.areaEditada.set(a);
    this.areaForm.setValue({ nombre: a.nombre });
    this.formArea.set(true);
  }

  protected guardarArea(): void {
    this.areaForm.markAllAsTouched();
    if (this.areaForm.invalid) return;
    const nombre = this.areaForm.controls.nombre.value.trim();
    const actual = this.areaEditada();
    this.guardando.set(true);
    (actual
      ? this.catalogo.actualizarArea(actual.id, nombre)
      : this.catalogo.crearArea(nombre)
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito(actual ? 'Área actualizada.' : 'Área creada.');
        this.formArea.set(false);
        this.datos.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected eliminarArea(a: Area): void {
    this.dialogos
      .confirmar({
        titulo: 'Eliminar área',
        mensaje: `Se eliminará el área «${a.nombre}». Si tiene cargos o empleados, el sistema no lo permitirá.`,
        accion: 'Eliminar',
      })
      .subscribe(() =>
        this.catalogo.eliminarArea(a.id).subscribe(() => {
          this.avisos.exito('Área eliminada.');
          this.datos.cargar();
        }),
      );
  }

  protected nuevoCargo(): void {
    this.cargoEditado.set(null);
    this.cargoForm.reset();
    this.formCargo.set(true);
  }

  protected editarCargo(c: Cargo): void {
    this.cargoEditado.set(c);
    this.cargoForm.setValue({
      nombre: c.nombre,
      areaId: c.areaId,
      sueldoReferencial: c.sueldoReferencial,
    });
    this.formCargo.set(true);
  }

  protected guardarCargo(): void {
    this.cargoForm.markAllAsTouched();
    if (this.cargoForm.invalid) return;
    const v = this.cargoForm.getRawValue();
    const datos = {
      nombre: v.nombre.trim(),
      areaId: v.areaId,
      sueldoReferencial: Number(v.sueldoReferencial),
    };
    const actual = this.cargoEditado();
    this.guardando.set(true);
    (actual
      ? this.catalogo.actualizarCargo(actual.id, datos)
      : this.catalogo.crearCargo(datos)
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito(actual ? 'Cargo actualizado.' : 'Cargo creado.');
        this.formCargo.set(false);
        this.datos.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected eliminarCargo(c: Cargo): void {
    this.dialogos
      .confirmar({
        titulo: 'Eliminar cargo',
        mensaje: `Se eliminará el cargo «${c.nombre}». Si hay empleados con este cargo, el sistema no lo permitirá.`,
        accion: 'Eliminar',
      })
      .subscribe(() =>
        this.catalogo.eliminarCargo(c.id).subscribe(() => {
          this.avisos.exito('Cargo eliminado.');
          this.datos.cargar();
        }),
      );
  }
}
