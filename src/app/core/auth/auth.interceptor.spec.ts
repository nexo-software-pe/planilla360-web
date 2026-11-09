import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '../http/api-error';
import { AuthService } from './auth.service';
import { API, configurarHttp, iniciarSesionFalsa, tokens } from './pruebas-auth.testing';

const NO_AUTORIZADO = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    configurarHttp();
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  it('agrega el JWT a las llamadas a la API', () => {
    iniciarSesionFalsa();
    http.get(`${API}/empleados`).subscribe();
    const req = backend.expectOne(`${API}/empleados`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer acc-1');
    req.flush([]);
  });

  it('no manda el JWT a otros dominios', () => {
    iniciarSesionFalsa();
    http.get('https://otro.dominio/datos').subscribe();
    const req = backend.expectOne('https://otro.dominio/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ante un 401 renueva el token y repite la petición sin que el llamador lo note', () => {
    iniciarSesionFalsa();
    let respuesta: unknown;
    http.get(`${API}/empleados`).subscribe((r) => (respuesta = r));

    backend.expectOne(`${API}/empleados`).flush({}, NO_AUTORIZADO);
    const refresh = backend.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'ref-1' });
    refresh.flush(tokens('acc-2', 'ref-2'));

    const reintento = backend.expectOne(`${API}/empleados`);
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer acc-2');
    reintento.flush(['ok']);

    expect(respuesta).toEqual(['ok']);
    expect(localStorage.getItem('planilla360.refresh')).toBe('ref-2');
  });

  it('varias peticiones con 401 a la vez comparten una sola renovación', () => {
    iniciarSesionFalsa();
    const resultados: unknown[] = [];
    http.get(`${API}/a`).subscribe((r) => resultados.push(r));
    http.get(`${API}/b`).subscribe((r) => resultados.push(r));

    backend.expectOne(`${API}/a`).flush({}, NO_AUTORIZADO);
    backend.expectOne(`${API}/b`).flush({}, NO_AUTORIZADO);
    backend.expectOne(`${API}/auth/refresh`).flush(tokens('acc-2', 'ref-2'));

    backend.expectOne(`${API}/a`).flush('A');
    backend.expectOne(`${API}/b`).flush('B');
    expect(resultados.sort()).toEqual(['A', 'B']);
  });

  it('si la renovación falla cierra la sesión y manda al login', () => {
    iniciarSesionFalsa();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let error: unknown;
    http.get(`${API}/empleados`).subscribe({ error: (e) => (error = e) });

    backend.expectOne(`${API}/empleados`).flush({}, NO_AUTORIZADO);
    backend.expectOne(`${API}/auth/refresh`).flush({}, NO_AUTORIZADO);

    expect(auth.autenticado()).toBe(false);
    expect(localStorage.getItem('planilla360.refresh')).toBeNull();
    expect(error).toBeInstanceOf(ApiError);
    expect(navegar).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('un corte de red durante la renovación no destruye la sesión guardada', () => {
    iniciarSesionFalsa();
    http.get(`${API}/empleados`).subscribe({ error: () => undefined });

    backend.expectOne(`${API}/empleados`).flush({}, NO_AUTORIZADO);
    backend.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'), { status: 0 });

    expect(localStorage.getItem('planilla360.refresh')).toBe('ref-1');
  });

  it('un 401 del login no intenta renovar', () => {
    let error: unknown;
    auth.iniciarSesion('x@y.pe', 'mala').subscribe({ error: (e) => (error = e) });
    backend
      .expectOne(`${API}/auth/login`)
      .flush({ detail: 'Credenciales inválidas' }, NO_AUTORIZADO);
    expect((error as ApiError).estado).toBe(401);
    backend.expectNone(`${API}/auth/refresh`);
  });

  it('un 401 sin refresh token no intenta renovar', () => {
    http.get(`${API}/empleados`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/empleados`).flush({}, NO_AUTORIZADO);
    backend.expectNone(`${API}/auth/refresh`);
  });
});
