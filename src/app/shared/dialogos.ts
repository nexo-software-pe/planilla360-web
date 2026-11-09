import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable, filter, map } from 'rxjs';
import { mensajeDeError, passwordValidator } from './validadores';

export interface DatosDialogoTexto {
  titulo: string;
  etiqueta: string;
  accion: string;
  tipo?: 'text' | 'password';
  ayuda?: string;
}

export interface DatosDialogoConfirmar {
  titulo: string;
  mensaje: string;
  accion: string;
}

/** Pide un texto (motivo de rechazo, contraseña nueva…). Devuelve el texto o `undefined`. */
@Component({
  selector: 'app-dialogo-texto',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <form (submit)="$event.preventDefault(); aceptar()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="completo">
          <mat-label>{{ datos.etiqueta }}</mat-label>
          <input matInput [type]="datos.tipo ?? 'text'" [formControl]="texto" autocomplete="off" />
          @if (datos.ayuda) {
            <mat-hint>{{ datos.ayuda }}</mat-hint>
          }
          @if (texto.invalid && texto.touched) {
            <mat-error>{{ mensaje(texto) }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">{{ datos.accion }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .completo {
      width: 100%;
      min-width: 280px;
    }
  `,
})
export class DialogoTexto {
  protected readonly datos = inject<DatosDialogoTexto>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<DialogoTexto, string>>(MatDialogRef);
  protected readonly mensaje = mensajeDeError;
  protected readonly texto = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(this.datos.tipo === 'password' ? 72 : 300),
      ...(this.datos.tipo === 'password' ? [passwordValidator] : []),
    ],
  });

  protected aceptar(): void {
    this.texto.markAsTouched();
    if (this.texto.valid) this.ref.close(this.texto.value.trim());
  }
}

/** Confirmación de una acción destructiva o irreversible. Devuelve `true` al aceptar. */
@Component({
  selector: 'app-dialogo-confirmar',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <mat-dialog-content>{{ datos.mensaje }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">{{ datos.accion }}</button>
    </mat-dialog-actions>
  `,
})
export class DialogoConfirmar {
  protected readonly datos = inject<DatosDialogoConfirmar>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class DialogosService {
  private readonly dialog = inject(MatDialog);

  /** Emite `true` solo si la persona confirma. */
  confirmar(datos: DatosDialogoConfirmar): Observable<true> {
    return this.dialog
      .open<DialogoConfirmar, DatosDialogoConfirmar, boolean>(DialogoConfirmar, { data: datos })
      .afterClosed()
      .pipe(
        filter((ok): ok is true => ok === true),
        map(() => true as const),
      );
  }

  /** Emite el texto ingresado; no emite si cancela. */
  pedirTexto(datos: DatosDialogoTexto): Observable<string> {
    return this.dialog
      .open<DialogoTexto, DatosDialogoTexto, string>(DialogoTexto, { data: datos })
      .afterClosed()
      .pipe(filter((t): t is string => typeof t === 'string' && t !== ''));
  }
}
