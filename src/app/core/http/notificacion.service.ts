import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Toasts globales (errores y confirmaciones). El lector de pantalla los anuncia solo. */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);

  error(mensaje: string): void {
    this.mostrar(mensaje, 'toast-error', 7000);
  }

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'toast-exito', 4000);
  }

  info(mensaje: string): void {
    this.mostrar(mensaje, 'toast-info', 5000);
  }

  private mostrar(mensaje: string, clase: string, duracion: number): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: duracion, panelClass: clase });
  }
}
