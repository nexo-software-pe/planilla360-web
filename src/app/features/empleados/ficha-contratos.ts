import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { startWith } from 'rxjs';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EstadoLista } from '../../shared/estado-lista';
import { FechaPipe } from '../../shared/fecha.pipe';
import { recurso } from '../../shared/recurso';
import { SolesPipe } from '../../shared/soles.pipe';
import { mensajeDeError } from '../../shared/validadores';
import { CatalogoService } from '../catalogo/catalogo.service';
import { Contrato, ContratoRequest, EmpleadosService } from './empleados.service';

const TIPOS = { INDEFINIDO: 'Indefinido', PLAZO_FIJO: 'Plazo fijo', PART_TIME: 'Tiempo parcial' };

@Component({
  selector: 'app-ficha-contratos',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EstadoLista,
    FechaPipe,
    SolesPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barra">
      <h2>Contratos</h2>
      @if (!cesado() && !formulario()) {
        <button mat-flat-button type="button" (click)="formulario.set(true)">Nuevo contrato</button>
      }
    </div>

    @if (formulario()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h3>Nuevo contrato</h3>
        <div class="rejilla-form">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de contrato</mat-label>
            <mat-select formControlName="tipo" required>
              @for (t of tipos; track t.valor) {
                <mat-option [value]="t.valor">{{ t.texto }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Inicio</mat-label>
            <input matInput type="date" formControlName="fechaInicio" required />
            @if (form.controls.fechaInicio.touched && form.controls.fechaInicio.invalid) {
              <mat-error>{{ error(form.controls.fechaInicio) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fin</mat-label>
            <input matInput type="date" formControlName="fechaFin" />
            @if (form.controls.fechaFin.touched && form.controls.fechaFin.invalid) {
              <mat-error>{{ error(form.controls.fechaFin) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sueldo básico (S/)</mat-label>
            <input
              matInput
              type="number"
              step="0.01"
              min="0"
              formControlName="sueldoBasico"
              required
            />
            @if (form.controls.sueldoBasico.touched && form.controls.sueldoBasico.invalid) {
              <mat-error>{{ error(form.controls.sueldoBasico) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Jornada semanal (horas)</mat-label>
            <input
              matInput
              type="number"
              min="1"
              max="48"
              formControlName="jornadaSemanal"
              required
            />
            @if (form.controls.jornadaSemanal.touched && form.controls.jornadaSemanal.invalid) {
              <mat-error>{{ error(form.controls.jornadaSemanal) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Días laborables por semana</mat-label>
            <input
              matInput
              type="number"
              min="1"
              max="7"
              formControlName="diasLaborables"
              required
            />
            @if (form.controls.diasLaborables.touched && form.controls.diasLaborables.invalid) {
              <mat-error>{{ error(form.controls.diasLaborables) }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Régimen pensionario</mat-label>
            <mat-select formControlName="regimenPensionario" required>
              <mat-option value="ONP">ONP</mat-option>
              <mat-option value="AFP">AFP</mat-option>
            </mat-select>
          </mat-form-field>
          @if (regimen() === 'AFP') {
            <mat-form-field appearance="outline">
              <mat-label>AFP</mat-label>
              <mat-select formControlName="afpId" required>
                @for (a of afps(); track a.id) {
                  <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
                }
              </mat-select>
              @if (form.controls.afpId.touched && form.controls.afpId.invalid) {
                <mat-error>{{ error(form.controls.afpId) }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo de comisión</mat-label>
              <mat-select formControlName="tipoComision" required>
                <mat-option value="FLUJO">Sobre el flujo</mat-option>
                <mat-option value="MIXTA">Mixta</mat-option>
              </mat-select>
              @if (form.controls.tipoComision.touched && form.controls.tipoComision.invalid) {
                <mat-error>{{ error(form.controls.tipoComision) }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>CUSPP</mat-label>
              <input matInput formControlName="cuspp" maxlength="12" />
            </mat-form-field>
          }
        </div>
        <div class="acciones-form">
          <button mat-flat-button type="submit" [disabled]="guardando()">Guardar contrato</button>
          <button mat-button type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    <section class="tabla-caja" aria-label="Contratos del empleado">
      @if (lista.datos(); as contratos) {
        @if (contratos.length > 0) {
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Vigencia</th>
                <th scope="col" class="cifra">Sueldo básico</th>
                <th scope="col" class="cifra">Jornada</th>
                <th scope="col">Pensión</th>
              </tr>
            </thead>
            <tbody>
              @for (c of contratos; track c.id) {
                <tr>
                  <td>{{ tipoTexto(c) }}</td>
                  <td>
                    {{ c.fechaInicio | fecha }} –
                    {{ c.fechaFin ? (c.fechaFin | fecha) : 'indefinido' }}
                  </td>
                  <td class="cifra">{{ c.sueldoBasico | soles }}</td>
                  <td class="cifra">{{ c.jornadaSemanal }} h · {{ c.diasLaborables }} días</td>
                  <td>{{ c.regimenPensionario }}</td>
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
        mensajeVacio="Este empleado aún no tiene contratos. Sin contrato no entra en la planilla."
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
  `,
})
export class FichaContratos {
  readonly empleadoId = input.required<string>();
  readonly cesado = input(false);

  private readonly servicio = inject(EmpleadosService);
  private readonly avisos = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly error = mensajeDeError;
  protected readonly formulario = signal(false);
  protected readonly guardando = signal(false);
  protected readonly afps = toSignal(inject(CatalogoService).afps(), { initialValue: [] });
  protected readonly tipos = Object.entries(TIPOS).map(([valor, texto]) => ({ valor, texto }));

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['INDEFINIDO' as ContratoRequest['tipo'], Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    sueldoBasico: [null as number | null, [Validators.required, Validators.min(0.01)]],
    jornadaSemanal: [48, [Validators.required, Validators.min(1), Validators.max(48)]],
    diasLaborables: [5, [Validators.required, Validators.min(1), Validators.max(7)]],
    regimenPensionario: ['ONP' as ContratoRequest['regimenPensionario'], Validators.required],
    afpId: [''],
    tipoComision: [''],
    cuspp: [''],
  });

  protected readonly regimen = toSignal(
    this.form.controls.regimenPensionario.valueChanges.pipe(
      startWith(this.form.controls.regimenPensionario.value),
    ),
    { requireSync: true },
  );

  protected readonly lista = recurso(() => this.servicio.contratos(this.empleadoId()));

  constructor() {
    queueMicrotask(() => this.lista.cargar());
    this.form.controls.regimenPensionario.valueChanges.subscribe((r) => {
      const { afpId, tipoComision } = this.form.controls;
      if (r === 'AFP') {
        afpId.addValidators(Validators.required);
        tipoComision.addValidators(Validators.required);
      } else {
        afpId.clearValidators();
        tipoComision.clearValidators();
        afpId.reset('');
        tipoComision.reset('');
      }
      afpId.updateValueAndValidity();
      tipoComision.updateValueAndValidity();
    });
    this.form.controls.tipo.valueChanges.subscribe((t) => {
      const fin = this.form.controls.fechaFin;
      if (t === 'PLAZO_FIJO') fin.addValidators(Validators.required);
      else fin.removeValidators(Validators.required);
      fin.updateValueAndValidity();
    });
  }

  protected tipoTexto(c: Contrato): string {
    return TIPOS[c.tipo];
  }

  protected cancelar(): void {
    this.formulario.set(false);
    this.form.reset();
  }

  protected guardar(): void {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (v.fechaFin && v.fechaFin < v.fechaInicio) {
      this.form.controls.fechaFin.setErrors({
        servidor: 'El fin no puede ser anterior al inicio.',
      });
    }
    if (this.form.invalid) return;
    const datos: ContratoRequest = {
      tipo: v.tipo,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin || null,
      sueldoBasico: Number(v.sueldoBasico),
      jornadaSemanal: v.jornadaSemanal,
      diasLaborables: v.diasLaborables,
      regimenPensionario: v.regimenPensionario,
      afpId: v.regimenPensionario === 'AFP' ? v.afpId : null,
      tipoComision: v.regimenPensionario === 'AFP' ? (v.tipoComision as 'FLUJO' | 'MIXTA') : null,
      cuspp: v.regimenPensionario === 'AFP' && v.cuspp ? v.cuspp.trim() : null,
    };
    this.guardando.set(true);
    this.servicio.crearContrato(this.empleadoId(), datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.exito('Contrato registrado.');
        this.cancelar();
        this.lista.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }
}
