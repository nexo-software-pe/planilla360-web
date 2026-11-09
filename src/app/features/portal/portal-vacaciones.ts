import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_SOLICITUD_VACACIONES, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyIso } from '../../shared/fechas';
import { recurso } from '../../shared/recurso';
import { mensajeDeError, rangoFechasValidator } from '../../shared/validadores';
import { SolicitudVacaciones, VacacionesService } from '../vacaciones/vacaciones.service';

/** Mis vacaciones: saldo por periodo, solicitar y seguir el estado de cada solicitud. */
@Component({
  selector: 'app-portal-vacaciones',
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
    <app-encabezado-pagina titulo="Mis vacaciones" />

    @if (datos.datos(); as d) {
      <div class="pila">
        <section class="tarjeta" aria-labelledby="titulo-saldo">
          <h2 id="titulo-saldo">Saldo</h2>
          <p class="cifra-grande">
            {{ d.saldo.diasDisponibles }} <span class="unidad">días disponibles</span>
          </p>
          <ul class="periodos">
            @for (p of d.saldo.periodos; track p.periodoId) {
              <li>
                <span>{{ p.desde | fecha }} – {{ p.hasta | fecha }}</span>
                <strong>{{ p.diasDisponibles }} días</strong>
              </li>
            }
          </ul>
        </section>

        <form class="tarjeta" [formGroup]="form" (ngSubmit)="solicitar()" novalidate>
          <h2>Solicitar vacaciones</h2>
          <mat-form-field appearance="outline" class="completo">
            <mat-label>Desde</mat-label>
            <input matInput type="date" formControlName="desde" [min]="hoy" required />
            @if (form.controls.desde.touched && form.controls.desde.invalid) {
              <mat-error>{{ error(form.controls.desde) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="completo">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" formControlName="hasta" [min]="hoy" required />
            @if (form.controls.hasta.touched && form.controls.hasta.invalid) {
              <mat-error>{{ error(form.controls.hasta) }}</mat-error>
            }
          </mat-form-field>
          @if (form.errors?.['rango'] && form.touched) {
            <p class="aviso aviso--error" role="alert">
              La fecha final no puede ser anterior a la inicial.
            </p>
          }
          <button mat-flat-button type="submit" class="completo" [disabled]="enviando()">
            Enviar solicitud
          </button>
        </form>

        <section aria-labelledby="titulo-solicitudes">
          <h2 id="titulo-solicitudes">Mis solicitudes</h2>
          @if (d.solicitudes.length > 0) {
            <ul class="lista">
              @for (s of d.solicitudes; track s.id) {
                <li class="tarjeta solicitud">
                  <div class="fila">
                    <strong>{{ s.desde | fecha }} – {{ s.hasta | fecha }}</strong>
                    <app-etiqueta [texto]="visual(s).texto" [tono]="visual(s).tono" />
                  </div>
                  <p class="detalle">{{ s.dias }} días</p>
                  @if (s.motivoRechazo) {
                    <p class="aviso aviso--error">Motivo del rechazo: {{ s.motivoRechazo }}</p>
                  }
                  @if (s.estado === 'SOLICITADA' || s.estado === 'APROBADA_JEFE') {
                    <button
                      mat-stroked-button
                      type="button"
                      [attr.aria-label]="'Cancelar la solicitud del ' + (s.desde | fecha)"
                      (click)="cancelar(s)"
                    >
                      Cancelar solicitud
                    </button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="vacio">Aún no has solicitado vacaciones.</p>
          }
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
    .tarjeta {
      padding: 16px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .cifra-grande {
      margin: 0 0 8px;
      font-family: var(--fuente-titulo);
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
    }
    .unidad {
      font-family: var(--fuente-texto);
      font-size: 14px;
      font-weight: 500;
      color: var(--color-texto-secundario);
    }
    .periodos,
    .lista {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .periodos li,
    .fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .completo {
      width: 100%;
      margin-bottom: 8px;
    }
    .detalle {
      margin: 4px 0 8px;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
    .vacio {
      color: var(--color-texto-secundario);
    }
  `,
})
export class PortalVacaciones {
  private readonly servicio = inject(VacacionesService);
  private readonly avisos = inject(NotificacionService);
  private readonly dialogos = inject(DialogosService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly hoy = hoyIso();
  protected readonly enviando = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    { desde: ['', Validators.required], hasta: ['', Validators.required] },
    { validators: rangoFechasValidator },
  );

  protected readonly datos = recurso(() =>
    forkJoin({ saldo: this.servicio.miSaldo(), solicitudes: this.servicio.solicitudes() }),
  );

  constructor() {
    this.datos.cargar();
  }

  protected visual(s: SolicitudVacaciones) {
    return estadoVisual(ESTADO_SOLICITUD_VACACIONES, s.estado);
  }

  protected solicitar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { desde, hasta } = this.form.getRawValue();
    this.enviando.set(true);
    this.servicio.solicitar(desde, hasta).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito('Solicitud enviada. Tu jefe y RRHH la revisarán.');
        this.form.reset();
        this.datos.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected cancelar(s: SolicitudVacaciones): void {
    this.dialogos
      .confirmar({
        titulo: 'Cancelar solicitud',
        mensaje: 'La solicitud dejará de estar en trámite. ¿Cancelarla?',
        accion: 'Cancelar solicitud',
      })
      .subscribe(() =>
        this.servicio.cancelar(s.id).subscribe(() => {
          this.avisos.exito('Solicitud cancelada.');
          this.datos.cargar();
        }),
      );
  }
}
