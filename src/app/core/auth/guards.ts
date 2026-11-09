import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol, rutaInicialPara } from './auth.models';
import { AuthService } from './auth.service';

/** Exige sesión iniciada; si no, manda al login recordando la ruta pedida. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.autenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Exige uno de los roles dados; si no, 403. Se usa después de `authGuard`. */
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return () => {
    const rol = inject(AuthService).rol();
    if (rol !== null && roles.includes(rol)) return true;
    return inject(Router).createUrlTree(['/acceso-denegado']);
  };
}

/** Para el login: quien ya inició sesión va directo a su pantalla de inicio. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.autenticado()) return true;
  return inject(Router).parseUrl(rutaInicialPara(auth.rol()));
};
