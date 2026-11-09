import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EmpleadosService } from '../empleados/empleados.service';
import { AsistenciaTabla } from './asistencia-tabla';

/** Detalle diario: se elige el empleado (o llega desde el resumen por query params). */
@Component({
  selector: 'app-asistencia-detalle',
  imports: [MatFormFieldModule, MatSelectModule, AsistenciaTabla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="empleado">
      <mat-label>Empleado</mat-label>
      <mat-select [value]="elegido()" (valueChange)="elegido.set($event)">
        @for (e of empleados(); track e.id) {
          <mat-option [value]="e.id">{{ e.apellidos }}, {{ e.nombres }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @if (elegido(); as id) {
      @for (clave of [id]; track clave) {
        <app-asistencia-tabla [empleadoId]="id" [mesInicial]="mes()" />
      }
    } @else {
      <p class="vacio">Elige un empleado para ver su asistencia día por día.</p>
    }
  `,
  styles: `
    .empleado {
      min-width: 280px;
      margin: 0 16px 16px 0;
    }
    .vacio {
      color: var(--color-texto-secundario);
    }
  `,
})
export class AsistenciaDetalle {
  /** Query params enlazados por el router (`withComponentInputBinding`). */
  readonly empleadoId = input<string>();
  readonly mes = input<string>();

  protected readonly empleados = toSignal(inject(EmpleadosService).directorio(), {
    initialValue: [],
  });
  protected readonly elegido = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => this.elegido.set(this.empleadoId() ?? null));
  }
}
