import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { API, configurarHttp, iniciarSesionFalsa, perfil, tokens } from './pruebas-auth.testing';

describe('AuthService', () => {
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    configurarHttp();
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  it('al iniciar sesión guarda el usuario, la empresa y el refresh token', () => {
    iniciarSesionFalsa();
    expect(auth.autenticado()).toBe(true);
    expect(auth.rol()).toBe('RRHH');
    expect(auth.empresa()?.ruc).toBe('20123456789');
    expect(localStorage.getItem('planilla360.refresh')).toBe('ref-1');
  });

  it('si falla la carga del perfil deja la sesión limpia', () => {
    auth.iniciarSesion('a@b.pe', 'x').subscribe({ error: () => undefined });
    backend.expectOne(`${API}/auth/login`).flush(tokens('a', 'r'));
    backend.expectOne(`${API}/auth/me`).flush({}, { status: 500, statusText: 'Error' });
    expect(auth.autenticado()).toBe(false);
    expect(localStorage.getItem('planilla360.refresh')).toBeNull();
  });

  it('restaura la sesión al arrancar con el refresh token guardado', () => {
    localStorage.setItem('planilla360.refresh', 'ref-guardado');
    auth.restaurarSesion().subscribe();
    const refresh = backend.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'ref-guardado' });
    refresh.flush(tokens('acc-nuevo', 'ref-nuevo'));
    backend.expectOne(`${API}/auth/me`).flush(perfil());
    expect(auth.autenticado()).toBe(true);
    expect(auth.token()).toBe('acc-nuevo');
  });

  it('no llama a la API al arrancar si no hay refresh token', () => {
    auth.restaurarSesion().subscribe();
    backend.expectNone(`${API}/auth/refresh`);
    expect(auth.autenticado()).toBe(false);
  });

  it('al arrancar con un refresh token vencido queda sin sesión y sin errores', () => {
    localStorage.setItem('planilla360.refresh', 'vencido');
    let terminado = false;
    auth.restaurarSesion().subscribe(() => (terminado = true));
    backend.expectOne(`${API}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(terminado).toBe(true);
    expect(auth.autenticado()).toBe(false);
    expect(localStorage.getItem('planilla360.refresh')).toBeNull();
  });

  it('cerrar sesión avisa a la API, limpia todo y va al login', () => {
    iniciarSesionFalsa();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.cerrarSesion().subscribe();
    const logout = backend.expectOne(`${API}/auth/logout`);
    expect(logout.request.body).toEqual({ refreshToken: 'ref-1' });
    logout.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.autenticado()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('planilla360.refresh')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('cerrar sesión limpia aunque la API falle', () => {
    iniciarSesionFalsa();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.cerrarSesion().subscribe();
    backend.expectOne(`${API}/auth/logout`).error(new ProgressEvent('error'), { status: 0 });
    expect(auth.autenticado()).toBe(false);
  });
});
