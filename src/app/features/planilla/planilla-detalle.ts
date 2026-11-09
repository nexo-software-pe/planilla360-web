import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificacionService } from '../../core/http/notificacion.service';
import { descargarBlob } from '../../shared/descarga';
import { DialogosService } from '../../shared/dialogos';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EstadoLista } from '../../shared/estado-lista';
import { ESTADO_PLANILLA, estadoVisual } from '../../shared/estados';
import { Etiqueta } from '../../shared/etiqueta';
import { hoyIso, nombreDeMes } from '../../shared/fechas';
import { Pagina } from '../../shared/pagina';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { EmpleadosService, indexarPorId } from '../empleados/empleados.service';
import { TIPO_PLANILLA_TEXTO } from './planilla-lista';
import { Boleta, LineaPlanilla, PlanillaService } from './planilla.service';
import { PlanillaStore } from './planilla.store';

const ESTADO_BOLETA: Record<
  Boleta['estado'],
  { texto: string; tono: 'exito' | 'info' | 'error' | 'advertencia' }
> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
  GENERADA: { texto: 'Generada', tono: 'info' },
  ENVIADA: { texto: 'Enviada', tono: 'exito' },
  FALLIDA: { texto: 'Fallida', tono: 'error' },
};

/** Planilla del mes: calcular, revisar líneas y validaciones, cerrar y seguir las boletas. */
@Component({
  selector: 'app-planilla-detalle',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    EncabezadoPagina,
    EstadoLista,
    Etiqueta,
    SolesPipe,
  ],
  providers: [PlanillaStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.planilla(); as p) {
      <app-encabezado-pagina
        [titulo]="tipoTexto() + ' de ' + periodoTexto()"
        [subtitulo]="p.trabajadores + ' trabajadores'"
      >
        <a mat-stroked-button routerLink="/panel/planilla">Volver a planillas</a>
        @if (esAdminEmpresa() && store.puedeAnular()) {
          <button mat-stroked-button type="button" (click)="anular()">Anular planilla</button>
        }
        @if (store.esCerrada()) {
          <button
            mat-stroked-button
            type="button"
            [disabled]="!store.puedePagar()"
            (click)="pagando.set(true)"
          >
            Registrar pago
          </button>
          <button
            mat-stroked-button
            type="button"
            [disabled]="!store.puedeGenerarBoletas()"
            (click)="store.generarBoletas()"
          >
            Generar boletas
          </button>
        }
        @if (p.estado === 'BORRADOR' || p.estado === 'CALCULADA') {
          <button
            mat-stroked-button
            type="button"
            [disabled]="!store.puedeCalcular()"
            (click)="store.calcular()"
          >
            {{ p.estado === 'BORRADOR' ? 'Calcular planilla' : 'Recalcular' }}
          </button>
          <button
            mat-flat-button
            type="button"
            [disabled]="!store.puedeCerrar()"
            [attr.aria-describedby]="store.incidencias().length > 0 ? 'validaciones' : null"
            (click)="cerrar()"
          >
            Cerrar planilla
          </button>
        }
      </app-encabezado-pagina>

      <p class="estado-fila">
        <app-etiqueta [texto]="estado().texto" [tono]="estado().tono" />
        @if (store.accion(); as a) {
          <span class="solo-lector" role="status">{{ textoAccion(a) }}</span>
        }
      </p>

      @if (store.error(); as e) {
        <p class="aviso aviso--error" role="alert">{{ e }}</p>
      }

      @if (store.incidencias().length > 0) {
        <section id="validaciones" class="aviso aviso--advertencia validaciones" role="alert">
          <h2>
            {{ store.incidencias().length }}
            {{
              store.incidencias().length === 1 ? 'validación pendiente' : 'validaciones pendientes'
            }}
            antes de cerrar
          </h2>
          <ul>
            @for (i of store.incidencias(); track $index) {
              <li>{{ mensajeIncidencia(i.mensaje) }}</li>
            }
          </ul>
        </section>
      } @else if (p.estado === 'BORRADOR') {
        <p class="aviso aviso--info">
          La planilla está en borrador. Calcúlala para ver las líneas y las validaciones.
        </p>
      } @else if (p.estado === 'CALCULADA' && store.validacion()) {
        <p class="aviso aviso--info">Sin validaciones pendientes: ya puedes cerrar la planilla.</p>
      }

      @if (pagando()) {
        <form class="tarjeta formulario" [formGroup]="formPago" (ngSubmit)="pagar()" novalidate>
          <h2>Registrar pago</h2>
          <div class="rejilla-form">
            <mat-form-field appearance="outline">
              <mat-label>Fecha de pago</mat-label>
              <input matInput type="date" formControlName="fechaPago" required />
              @if (formPago.controls.fechaPago.touched && formPago.controls.fechaPago.invalid) {
                <mat-error>{{ error(formPago.controls.fechaPago) }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Referencia</mat-label>
              <input matInput formControlName="referencia" required />
              @if (formPago.controls.referencia.touched && formPago.controls.referencia.invalid) {
                <mat-error>{{ error(formPago.controls.referencia) }}</mat-error>
              }
            </mat-form-field>
          </div>
          <div class="acciones-form">
            <button mat-flat-button type="submit">Registrar pago</button>
            <button mat-button type="button" (click)="pagando.set(false)">Cancelar</button>
          </div>
        </form>
      }

      @if (p.estado !== 'BORRADOR') {
        <section class="totales" aria-label="Totales de la planilla">
          <article class="tarjeta">
            <h2>Total ingresos</h2>
            <p class="cifra monto">{{ p.totalIngresos | soles }}</p>
          </article>
          <article class="tarjeta">
            <h2>Total descuentos</h2>
            <p class="cifra monto">{{ p.totalDescuentos | soles }}</p>
          </article>
          <article class="tarjeta">
            <h2>Neto a pagar</h2>
            <p class="cifra monto monto--neto">{{ p.totalNeto | soles }}</p>
          </article>
          <article class="tarjeta">
            <h2>EsSalud (empleador)</h2>
            <p class="cifra monto">{{ p.totalEssalud | soles }}</p>
          </article>
        </section>

        <div class="detalle">
          <section class="tabla-caja" aria-label="Líneas de la planilla">
            @if (store.lineas().length > 0) {
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Trabajador</th>
                    <th scope="col" class="cifra">Básico</th>
                    <th scope="col" class="cifra">Ingresos</th>
                    <th scope="col" class="cifra">Descuentos</th>
                    <th scope="col" class="cifra">Neto</th>
                    <th scope="col"><span class="solo-lector">Boleta</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of store.lineas(); track l.empleadoId) {
                    <tr [class.seleccionada]="seleccion()?.empleadoId === l.empleadoId">
                      <td>{{ nombre(l.empleadoId) }}</td>
                      <td class="cifra">{{ l.basico | soles }}</td>
                      <td class="cifra">{{ l.totalIngresos | soles }}</td>
                      <td class="cifra">{{ l.totalDescuentos | soles }}</td>
                      <td class="cifra">
                        <strong>{{ l.neto | soles }}</strong>
                      </td>
                      <td>
                        <button
                          mat-button
                          type="button"
                          [attr.aria-pressed]="seleccion()?.empleadoId === l.empleadoId"
                          [attr.aria-label]="'Vista previa de la boleta de ' + nombre(l.empleadoId)"
                          (click)="seleccionar(l)"
                        >
                          Vista previa
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>

          @if (seleccion(); as l) {
            <aside class="tarjeta boleta" aria-label="Vista previa de la boleta">
              <h2>Boleta de {{ nombre(l.empleadoId) }}</h2>
              <p class="periodo">{{ periodoTexto() }} · {{ l.regimenPensionario }}</p>
              <h3>Ingresos</h3>
              <dl>
                @for (c of conceptos(l, 'INGRESO'); track c.codigo) {
                  <div>
                    <dt>{{ c.descripcion }}</dt>
                    <dd class="cifra">{{ c.monto | soles }}</dd>
                  </div>
                }
              </dl>
              <h3>Descuentos</h3>
              <dl>
                @for (c of conceptos(l, 'DESCUENTO'); track c.codigo) {
                  <div>
                    <dt>{{ c.descripcion }}</dt>
                    <dd class="cifra">{{ c.monto | soles }}</dd>
                  </div>
                } @empty {
                  <div>
                    <dt>Sin descuentos</dt>
                    <dd class="cifra">{{ 0 | soles }}</dd>
                  </div>
                }
              </dl>
              <p class="neto-boleta">
                Neto a pagar <strong class="cifra">{{ l.neto | soles }}</strong>
              </p>
            </aside>
          }
        </div>
      }

      @if (p.estado === 'CERRADA') {
        <section class="tarjeta boletas" aria-labelledby="titulo-boletas">
          <h2 id="titulo-boletas">Boletas de pago</h2>
          @if (store.boletas(); as b) {
            @if (b.total === 0) {
              <p class="aviso aviso--info">
                Aún no se generaron las boletas. Usa «Generar boletas» para crear los PDF y avisar a
                los trabajadores.
              </p>
            } @else {
              <p class="avance-texto" role="status" aria-live="polite">
                {{ b.generadas + b.enviadas }} de {{ b.total }} generadas ·
                {{ b.enviadas }} enviadas · {{ b.fallidas }} con error
                @if (store.boletasEnCurso()) {
                  · generando…
                }
              </p>
              <progress
                class="avance"
                [value]="b.generadas + b.enviadas + b.fallidas"
                [max]="b.total"
                aria-label="Avance de la generación de boletas"
              ></progress>
              @if (b.fallidas > 0) {
                <p class="aviso aviso--error">
                  {{ b.fallidas }} boletas fallaron. Puedes volver a pulsar «Generar boletas».
                </p>
              }
            }
          }
          @if (boletas.datos(); as lista) {
            @if (lista.contenido.length > 0) {
              <div class="tabla-caja">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Trabajador</th>
                      <th scope="col">Estado</th>
                      <th scope="col"><span class="solo-lector">Descarga</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (bo of lista.contenido; track bo.id) {
                      <tr>
                        <td>{{ nombre(bo.empleadoId) }}</td>
                        <td>
                          <app-etiqueta
                            [texto]="estadoBoleta(bo).texto"
                            [tono]="estadoBoleta(bo).tono"
                          />
                        </td>
                        <td>
                          @if (bo.estado === 'GENERADA' || bo.estado === 'ENVIADA') {
                            <button
                              mat-button
                              type="button"
                              [attr.aria-label]="'Descargar la boleta de ' + nombre(bo.empleadoId)"
                              (click)="descargar(bo)"
                            >
                              Descargar PDF
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        </section>
      }
    }
    <app-estado-lista
      [cargando]="store.cargando() && !store.planilla()"
      [error]="store.planilla() ? null : store.error()"
      (reintentar)="store.cargar(id())"
    />
  `,
  styles: `
    .estado-fila {
      margin: -12px 0 16px;
    }
    .formulario {
      margin-bottom: 16px;
    }
    .validaciones {
      margin-bottom: 16px;
    }
    .validaciones h2 {
      margin: 0 0 8px;
      font-family: var(--fuente-texto);
      font-size: 15px;
    }
    .validaciones ul {
      margin: 0;
      padding-left: 20px;
    }
    .totales {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    .totales h2 {
      margin: 0;
      color: var(--color-texto-secundario);
      font-family: var(--fuente-texto);
      font-size: 14px;
      font-weight: 500;
    }
    .monto {
      margin: 4px 0 0;
      font-family: var(--fuente-titulo);
      font-size: 24px;
      font-weight: 700;
      text-align: left;
    }
    .monto--neto {
      color: var(--color-primario-hover);
    }
    .detalle {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    @media (min-width: 1200px) {
      .detalle:has(.boleta) {
        grid-template-columns: minmax(0, 1fr) 340px;
      }
    }
    tr.seleccionada {
      background: var(--color-primario-suave);
    }
    .boleta h3 {
      margin: 16px 0 4px;
      font-size: 14px;
      color: var(--color-texto-secundario);
    }
    .boleta .periodo {
      margin: 0;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }
    dl {
      margin: 0;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
      border-bottom: 1px solid var(--color-borde);
      font-size: 14px;
    }
    dd {
      margin: 0;
    }
    .neto-boleta {
      display: flex;
      justify-content: space-between;
      margin: 16px 0 0;
      font-size: 16px;
    }
    .boletas {
      margin-top: 24px;
    }
    .avance {
      width: 100%;
      height: 12px;
      margin-bottom: 16px;
      accent-color: var(--color-primario);
    }
    .avance-texto {
      margin: 0 0 8px;
    }
  `,
})
export class PlanillaDetalle {
  readonly id = input.required<string>();

  protected readonly store = inject(PlanillaStore);
  private readonly servicio = inject(PlanillaService);
  private readonly dialogos = inject(DialogosService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly esAdminEmpresa = computed(() => this.auth.rol() === 'ADMIN_EMPRESA');
  private readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });
  private readonly indice = computed(() => indexarPorId(this.empleados()));

  protected readonly error = mensajeDeError;
  protected readonly seleccion = signal<LineaPlanilla | null>(null);
  protected readonly pagando = signal(false);
  protected readonly formPago = this.fb.nonNullable.group({
    fechaPago: [hoyIso(), Validators.required],
    referencia: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected readonly boletas = recurso<Pagina<Boleta>>(() =>
    this.servicio.boletasDePlanilla(this.id(), 0, 100),
  );

  protected readonly estado = computed(() =>
    estadoVisual(ESTADO_PLANILLA, this.store.planilla()?.estado),
  );
  protected readonly periodoTexto = computed(() =>
    nombreDeMes(this.store.planilla()?.periodo ?? ''),
  );
  protected readonly tipoTexto = computed(() => {
    const tipo = this.store.planilla()?.tipo;
    return tipo ? TIPO_PLANILLA_TEXTO[tipo] : 'Planilla';
  });

  constructor() {
    this.store.cargar(this.id); // rxMethod con signal: recarga si cambia el id de la ruta
    // cuando termina la generación (o ya estaba hecha) se lista cada boleta con su descarga
    effect(() => {
      const b = this.store.boletas();
      if (b && b.total > 0 && b.pendientes === 0) untracked(() => this.boletas.cargar());
    });
  }

  protected nombre(id: string): string {
    const e = this.indice().get(id);
    return e ? `${e.apellidos}, ${e.nombres}` : 'Trabajador';
  }

  /** La API nombra al trabajador por su id; en pantalla se muestra su nombre. */
  protected mensajeIncidencia(mensaje: string): string {
    return mensaje.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      (id) => {
        const e = this.indice().get(id);
        return e ? `${e.apellidos}, ${e.nombres}` : 'un trabajador';
      },
    );
  }

  protected conceptos(l: LineaPlanilla, tipo: 'INGRESO' | 'DESCUENTO') {
    return l.conceptos.filter((c) => c.tipo === tipo);
  }

  protected seleccionar(l: LineaPlanilla): void {
    this.seleccion.set(this.seleccion()?.empleadoId === l.empleadoId ? null : l);
  }

  protected estadoBoleta(b: Boleta) {
    return ESTADO_BOLETA[b.estado];
  }

  protected textoAccion(a: string): string {
    const textos: Record<string, string> = {
      calcular: 'Calculando la planilla…',
      cerrar: 'Cerrando la planilla…',
      anular: 'Anulando la planilla…',
      pago: 'Registrando el pago…',
      boletas: 'Iniciando la generación de boletas…',
    };
    return textos[a] ?? 'Procesando…';
  }

  protected cerrar(): void {
    this.dialogos
      .confirmar({
        titulo: 'Cerrar planilla',
        mensaje: `Al cerrar la planilla de ${this.periodoTexto()} ya no podrás recalcularla. ¿Continuar?`,
        accion: 'Cerrar planilla',
      })
      .subscribe(() => this.store.cerrar());
  }

  protected anular(): void {
    this.dialogos
      .pedirTexto({
        titulo: 'Anular planilla',
        etiqueta: 'Motivo de la anulación',
        accion: 'Anular planilla',
      })
      .subscribe((motivo) => this.store.anular(motivo));
  }

  protected pagar(): void {
    this.formPago.markAllAsTouched();
    if (this.formPago.invalid) return;
    const v = this.formPago.getRawValue();
    this.store.registrarPago(v.fechaPago, v.referencia.trim());
    this.pagando.set(false);
  }

  protected descargar(b: Boleta): void {
    this.servicio.pdfBoleta(b.id).subscribe({
      next: (blob) => descargarBlob(blob, `boleta-${b.periodo}-${this.nombre(b.empleadoId)}.pdf`),
      error: () => this.avisos.error('No se pudo descargar la boleta.'),
    });
  }
}
