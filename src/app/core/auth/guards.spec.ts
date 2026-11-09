import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { signal } from '@angular/core';
import { Rol, rutaInicialPara } from './auth.models';
import { AuthService } from './auth.service';
import { authGuard, invitadoGuard, rolGuard } from './guards';

function sesion(rol: Rol | null) {
  const actual = signal(rol);
  return { rol: actual, autenticado: () => actual() !== null };
}

function ejecutar(guard: CanActivateFn, rol: Rol | null, url = '/panel/empleados') {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: sesion(rol) }],
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

describe('guards', () => {
  it('authGuard deja pasar a quien tiene sesión', () => {
    expect(ejecutar(authGuard, 'RRHH')).toBe(true);
  });

  it('authGuard manda al login recordando la ruta pedida', () => {
    const destino = ejecutar(authGuard, null) as UrlTree;
    expect(destino.toString()).toBe('/login?returnUrl=%2Fpanel%2Fempleados');
  });

  it.each<[Rol, boolean]>([
    ['RRHH', true],
    ['ADMIN_EMPRESA', true],
    ['EMPLEADO', false],
    ['ADMIN_SAAS', false],
  ])('rolGuard(RRHH, ADMIN_EMPRESA) con %s permite=%s', (rol, permite) => {
    const resultado = ejecutar(rolGuard('RRHH', 'ADMIN_EMPRESA'), rol);
    if (permite) expect(resultado).toBe(true);
    else expect((resultado as UrlTree).toString()).toBe('/acceso-denegado');
  });

  it('rolGuard niega el acceso sin sesión', () => {
    const resultado = ejecutar(rolGuard('RRHH'), null) as UrlTree;
    expect(resultado.toString()).toBe('/acceso-denegado');
  });

  it('invitadoGuard deja ver el login a quien no tiene sesión', () => {
    expect(ejecutar(invitadoGuard, null)).toBe(true);
  });

  it.each<[Rol, string]>([
    ['EMPLEADO', '/portal'],
    ['RRHH', '/panel'],
    ['ADMIN_EMPRESA', '/panel'],
    ['ADMIN_SAAS', '/panel'],
  ])('invitadoGuard lleva a %s a %s', (rol, ruta) => {
    expect((ejecutar(invitadoGuard, rol) as UrlTree).toString()).toBe(ruta);
  });
});

describe('rutaInicialPara', () => {
  it('sin rol va al login', () => {
    expect(rutaInicialPara(null)).toBe('/login');
  });
});
