import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URL } from '../config/api-url';
import { AuthService } from './auth.service';

const RUTAS_PUBLICAS = ['/auth/login', '/auth/refresh'];

function conToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Agrega el JWT a las llamadas a la API y, ante un 401, renueva el token una vez y repite la
 * petición sin que el usuario lo note. Si la renovación falla, cierra la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(API_URL);
  const auth = inject(AuthService);
  const esPublica = RUTAS_PUBLICAS.some((r) => req.url === `${api}${r}`);
  if (!req.url.startsWith(api) || esPublica) return next(req);

  const token = auth.token();
  return next(token ? conToken(req, token) : req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !auth.tieneRefresh()) {
        return throwError(() => error);
      }
      return auth.refrescar().pipe(
        catchError((falloRefresh: unknown) => {
          // solo si el servidor rechazó el refresh (la sesión ya se limpió); un corte de red no cierra
          if (!auth.tieneRefresh()) auth.sesionExpirada();
          return throwError(() => falloRefresh);
        }),
        switchMap((nuevo) => next(conToken(req, nuevo))),
      );
    }),
  );
};
