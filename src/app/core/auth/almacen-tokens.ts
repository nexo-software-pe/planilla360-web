import { Injectable } from '@angular/core';

const CLAVE_REFRESH = 'planilla360.refresh';

/**
 * Guarda solo el refresh token (el access token vive en memoria). Si el almacenamiento del
 * navegador no está disponible (modo privado, bloqueo), la sesión simplemente no sobrevive a
 * una recarga.
 */
@Injectable({ providedIn: 'root' })
export class AlmacenTokens {
  leerRefresh(): string | null {
    try {
      return localStorage.getItem(CLAVE_REFRESH);
    } catch {
      return null;
    }
  }

  guardarRefresh(token: string): void {
    try {
      localStorage.setItem(CLAVE_REFRESH, token);
    } catch {
      // sin almacenamiento: la sesión dura lo que dure la pestaña
    }
  }

  borrar(): void {
    try {
      localStorage.removeItem(CLAVE_REFRESH);
    } catch {
      // nada que borrar
    }
  }
}
