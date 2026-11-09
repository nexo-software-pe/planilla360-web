import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { OMITIR_TOAST } from './contexto-http';
import { NotificacionService } from './notificacion.service';

/**
 * Manejo global de errores: convierte `HttpErrorResponse` en `ApiError` y avisa con un toast.
 * El 401 no avisa aquí: lo resuelve el interceptor de autenticación (refresh o cierre de sesión).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificaciones = inject(NotificacionService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const apiError = ApiError.desde(error);
      if (apiError.estado !== 401 && !req.context.get(OMITIR_TOAST)) {
        notificaciones.error(apiError.mensaje);
      }
      return throwError(() => apiError);
    }),
  );
};
