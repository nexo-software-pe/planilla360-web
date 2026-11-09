import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  0: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión no es válida. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas.',
  409: 'La operación entra en conflicto con el estado actual.',
  422: 'La operación incumple una regla de negocio.',
  429: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
};

/**
 * Error de la API ya interpretado (`application/problem+json`). Es lo que reciben los
 * componentes; nunca el `HttpErrorResponse` crudo.
 */
export class ApiError extends Error {
  constructor(
    readonly estado: number,
    readonly titulo: string,
    readonly detalle: string,
    readonly errores: ErrorCampo[] = [],
  ) {
    super(detalle);
    this.name = 'ApiError';
  }

  /** Texto para mostrar al usuario. */
  get mensaje(): string {
    return this.detalle;
  }

  static desde(error: HttpErrorResponse): ApiError {
    const cuerpo = error.error as Record<string, unknown> | null;
    const esProblema = cuerpo !== null && typeof cuerpo === 'object';
    const detalle = esProblema && typeof cuerpo['detail'] === 'string' ? cuerpo['detail'] : null;
    const titulo = esProblema && typeof cuerpo['title'] === 'string' ? cuerpo['title'] : null;
    const respaldo =
      MENSAJES_POR_ESTADO[error.status] ??
      (error.status >= 500
        ? 'Ocurrió un error en el servidor. Inténtalo más tarde.'
        : 'No se pudo completar la operación.');
    return new ApiError(
      error.status,
      titulo ?? respaldo,
      error.status >= 500 ? respaldo : (detalle ?? respaldo),
      esProblema ? ApiError.leerErrores(cuerpo['errores']) : [],
    );
  }

  private static leerErrores(valor: unknown): ErrorCampo[] {
    if (!Array.isArray(valor)) return [];
    return valor
      .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
      .map((e) => ({
        campo: String(e['campo'] ?? e['field'] ?? ''),
        mensaje: String(e['mensaje'] ?? e['message'] ?? ''),
      }));
  }
}
