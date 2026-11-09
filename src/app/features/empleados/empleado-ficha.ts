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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { Router, RouterLink } from '@angular/router';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_EMPLEADO, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyIso } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { mensajeDeError } from '../../shared/validadores';
import { AsistenciaTabla } from '../asistencia/asistencia-tabla';
import { CatalogoService } from '../catalogo/catalogo.service';
import { Empleado, EmpleadosService } from './empleados.service';
import { FichaContratos } from './ficha-contratos';
import { FichaFamiliares } from './ficha-familiares';
import { FichaVacaciones } from './ficha-vacaciones';

const PESTANAS = ['datos', 'contratos', 'familiares', 'asistencia', 'vacaciones'] as const;

@Component({
  selector: 'app-empleado-ficha',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
    FichaContratos,
    FichaFamiliares,
    FichaVacaciones,
    AsistenciaTabla,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ficha.datos(); as e) {
      <app-encabezado-pagina
        [titulo]="e.nombres + ' ' + e.apellidos"
        [subtitulo]="'DNI ' + e.dni + ' · ' + nombreCargo(e)"
      >
        <a mat-stroked-button routerLink="/panel/empleados">Volver a la lista</a>
        @if (e.estado !== 'CESADO') {
          <button mat-stroked-button type="button" (click)="cesando.set(true)">
            Registrar cese
          </button>
        }
        <a mat-flat-button [routerLink]="['editar']">Editar datos</a>
      </app-encabezado-pagina>

      @if (cesando()) {
        <form class="tarjeta cese" (submit)="$event.preventDefault(); cesar(e)">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Fecha de cese</mat-label>
            <input matInput type="date" [formControl]="fechaCese" />
            @if (fechaCese.touched && fechaCese.invalid) {
              <mat-error>{{ error(fechaCese) }}</mat-error>
            }
          </mat-form-field>
          <button mat-flat-button type="submit">Confirmar cese</button>
          <button mat-button type="button" (click)="cesando.set(false)">Cancelar</button>
        </form>
      }

      <mat-tab-group
        [selectedIndex]="indice()"
        (selectedTabChange)="cambiarPestana($event)"
        animationDuration="0ms"
        mat-stretch-tabs="false"
        aria-label="Secciones de la ficha"
      >
        <mat-tab label="Datos">
          <ng-template matTabContent>
            <section class="tarjeta datos">
              <dl>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <app-etiqueta [texto]="visual(e).texto" [tono]="visual(e).tono" />
                  </dd>
                </div>
                <div>
                  <dt>Área</dt>
                  <dd>{{ nombreArea(e) }}</dd>
                </div>
                <div>
                  <dt>Cargo</dt>
                  <dd>{{ nombreCargo(e) }}</dd>
                </div>
                <div>
                  <dt>Jefe directo</dt>
                  <dd>{{ nombreJefe(e) }}</dd>
                </div>
                <div>
                  <dt>Fecha de nacimiento</dt>
                  <dd>{{ e.fechaNacimiento | fecha }}</dd>
                </div>
                <div>
                  <dt>Fecha de ingreso</dt>
                  <dd>{{ e.fechaIngreso | fecha }}</dd>
                </div>
                @if (e.fechaCese) {
                  <div>
                    <dt>Fecha de cese</dt>
                    <dd>{{ e.fechaCese | fecha }}</dd>
                  </div>
                }
                <div>
                  <dt>Correo</dt>
                  <dd>{{ e.email || '—' }}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{{ e.telefono || '—' }}</dd>
                </div>
              </dl>
            </section>
          </ng-template>
        </mat-tab>
        <mat-tab label="Contratos">
          <ng-template matTabContent>
            <div class="pestana">
              <app-ficha-contratos [empleadoId]="e.id" [cesado]="e.estado === 'CESADO'" />
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Familiares">
          <ng-template matTabContent>
            <div class="pestana"><app-ficha-familiares [empleadoId]="e.id" /></div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Asistencia">
          <ng-template matTabContent>
            <div class="pestana"><app-asistencia-tabla [empleadoId]="e.id" /></div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Vacaciones">
          <ng-template matTabContent>
            <div class="pestana"><app-ficha-vacaciones [empleadoId]="e.id" /></div>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    }
    <app-estado-lista
      [cargando]="ficha.cargando() && !ficha.datos()"
      [error]="ficha.error()"
      (reintentar)="ficha.cargar()"
    />
  `,
  styles: `
    .cese {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .pestana {
      padding-top: 24px;
    }
    .datos {
      margin-top: 24px;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px 24px;
      margin: 0;
    }
    dt {
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
    dd {
      margin: 2px 0 0;
      font-weight: 500;
    }
  `,
})
export class EmpleadoFicha implements OnInit {
  readonly id = input.required<string>();
  /** Pestaña inicial (`?pestana=contratos`), enlazada desde la query string. */
  readonly pestana = input<string>();

  private readonly servicio = inject(EmpleadosService);
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionService);

  protected readonly error = mensajeDeError;
  protected readonly cesando = signal(false);
  protected readonly fechaCese = new FormControl(hoyIso(), {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected readonly areas = toSignal(this.catalogo.areas(), { initialValue: [] });
  protected readonly cargos = toSignal(this.catalogo.cargos(), { initialValue: [] });
  protected readonly directorio = toSignal(this.servicio.directorio(), { initialValue: [] });

  protected readonly ficha = recurso(() => this.servicio.obtener(this.id()));
  protected readonly indice = computed(() => {
    const i = PESTANAS.indexOf((this.pestana() ?? 'datos') as (typeof PESTANAS)[number]);
    return i < 0 ? 0 : i;
  });

  ngOnInit(): void {
    this.ficha.cargar();
  }

  protected cambiarPestana(e: MatTabChangeEvent): void {
    void this.router.navigate([], {
      queryParams: { pestana: PESTANAS[e.index] },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cesar(e: Empleado): void {
    this.fechaCese.markAsTouched();
    if (this.fechaCese.invalid) return;
    this.servicio.cesar(e.id, this.fechaCese.value).subscribe(() => {
      this.avisos.exito('Cese registrado.');
      this.cesando.set(false);
      this.ficha.cargar();
    });
  }

  protected visual(e: Empleado) {
    return estadoVisual(ESTADO_EMPLEADO, e.estado);
  }

  protected nombreArea(e: Empleado): string {
    return this.areas().find((a) => a.id === e.areaId)?.nombre ?? '—';
  }

  protected nombreCargo(e: Empleado): string {
    return this.cargos().find((c) => c.id === e.cargoId)?.nombre ?? '—';
  }

  protected nombreJefe(e: Empleado): string {
    const jefe = this.directorio().find((j) => j.id === e.jefeId);
    return jefe ? `${jefe.nombres} ${jefe.apellidos}` : 'Sin jefe';
  }
}
