import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_PERMISO, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { mensajeDeError, rangoFechasValidator } from '../../shared/validadores';
import {
  Permiso,
  TIPO_PERMISO,
  TipoPermiso,
  VacacionesService,
} from '../vacaciones/vacaciones.service';

/** Mis permisos: solicitar (médico, personal, licencia) y ver cómo va cada uno. */
@Component({
  selector: 'app-portal-permisos',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina titulo="Mis permisos" />
    <div class="pila">
      <form class="tarjeta" [formGroup]="form" (ngSubmit)="solicitar()" novalidate>
        <h2>Solicitar permiso</h2>
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Tipo de permiso</mat-label>
          <mat-select formControlName="tipo" required>
            @for (t of tipos; track t.valor) {
              <mat-option [value]="t.valor">{{ t.texto }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Desde</mat-label>
          <input matInput type="date" formControlName="desde" required />
          @if (form.controls.desde.touched && form.controls.desde.invalid) {
            <mat-error>{{ error(form.controls.desde) }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Hasta</mat-label>
          <input matInput type="date" formControlName="hasta" required />
          @if (form.controls.hasta.touched && form.controls.hasta.invalid) {
            <mat-error>{{ error(form.controls.hasta) }}</mat-error>
          }
        </mat-form-field>
        @if (form.errors?.['rango'] && form.touched) {
          <p class="aviso aviso--error" role="alert">
            La fecha final no puede ser anterior a la inicial.
          </p>
        }
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Motivo (opcional)</mat-label>
          <textarea matInput rows="2" formControlName="motivo" maxlength="300"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="conGoce">Con goce de haber</mat-checkbox>
        <button mat-flat-button type="submit" class="completo enviar" [disabled]="enviando()">
          Enviar solicitud
        </button>
      </form>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista">Mis solicitudes</h2>
        @if (lista.datos(); as permisos) {
          @if (permisos.length > 0) {
            <ul class="lista">
              @for (p of permisos; track p.id) {
                <li class="tarjeta">
                  <div class="fila">
                    <strong>{{ tipoTexto(p) }}</strong>
                    <app-etiqueta [texto]="visual(p).texto" [tono]="visual(p).tono" />
                  </div>
                  <p class="detalle">
                    {{ p.desde | fecha }} – {{ p.hasta | fecha }} · {{ p.dias }}
                    {{ p.dias === 1 ? 'día' : 'días' }} · {{ p.conGoce ? 'con goce' : 'sin goce' }}
                  </p>
                  @if (p.motivoRechazo) {
                    <p class="aviso aviso--error">Motivo del rechazo: {{ p.motivoRechazo }}</p>
                  }
                </li>
              }
            </ul>
          }
        }
        <app-estado-lista
          [cargando]="lista.cargando() && !lista.datos()"
          [error]="lista.error()"
          [vacio]="lista.datos()?.length === 0"
          mensajeVacio="Aún no has solicitado permisos."
          (reintentar)="lista.cargar()"
        />
      </section>
    </div>
  `,
  styles: `
    .tarjeta {
      padding: 16px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .completo {
      width: 100%;
      margin-bottom: 8px;
    }
    .enviar {
      margin-top: 8px;
    }
    .lista {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .detalle {
      margin: 4px 0 0;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
  `,
})
export class PortalPermisos {
  private readonly servicio = inject(VacacionesService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly enviando = signal(false);
  protected readonly tipos = (Object.keys(TIPO_PERMISO) as TipoPermiso[]).map((valor) => ({
    valor,
    texto: TIPO_PERMISO[valor],
  }));

  protected readonly form = this.fb.nonNullable.group(
    {
      tipo: ['PERSONAL' as TipoPermiso, Validators.required],
      desde: ['', Validators.required],
      hasta: ['', Validators.required],
      motivo: ['', Validators.maxLength(300)],
      conGoce: [false],
    },
    { validators: rangoFechasValidator },
  );

  protected readonly lista = recurso(() => this.servicio.permisos());

  constructor() {
    this.lista.cargar();
  }

  protected tipoTexto(p: Permiso): string {
    return TIPO_PERMISO[p.tipo];
  }

  protected visual(p: Permiso) {
    return estadoVisual(ESTADO_PERMISO, p.estado);
  }

  protected solicitar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.servicio.crearPermiso({ ...v, motivo: v.motivo.trim() || null }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito('Permiso solicitado. RRHH lo revisará.');
        this.form.reset({ tipo: 'PERSONAL', conGoce: false });
        this.lista.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }
}
