import { Injectable, computed, signal } from '@angular/core';

/** Cuenta las peticiones en curso para el indicador global de carga. */
@Injectable({ providedIn: 'root' })
export class CargaService {
  private readonly pendientes = signal(0);
  readonly activa = computed(() => this.pendientes() > 0);

  iniciar(): void {
    this.pendientes.update((n) => n + 1);
  }

  terminar(): void {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
