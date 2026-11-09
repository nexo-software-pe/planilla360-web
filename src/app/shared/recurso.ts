import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription } from 'rxjs';
import { ApiError } from '../core/http/api-error';

/**
 * Carga de datos de una pantalla con sus tres estados (cargando, error, datos). Debe crearse
 * en un contexto de inyección (campo del componente). `cargar()` cancela la petición anterior.
 */
export function recurso<T>(fuente: () => Observable<T>) {
  const destroyRef = inject(DestroyRef);
  const datos = signal<T | null>(null);
  const cargando = signal(false);
  const error = signal<string | null>(null);
  let sub: Subscription | undefined;

  function cargar(): void {
    sub?.unsubscribe();
    cargando.set(true);
    error.set(null);
    sub = fuente()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (d) => {
          datos.set(d);
          cargando.set(false);
        },
        error: (e: unknown) => {
          error.set(e instanceof ApiError ? e.mensaje : 'No se pudo cargar la información.');
          cargando.set(false);
        },
      });
  }

  return { datos, cargando, error, cargar };
}
