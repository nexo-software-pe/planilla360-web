import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API, configurarHttp } from '../auth/pruebas-auth.testing';
import { ApiError } from './api-error';
import { OMITIR_TOAST } from './contexto-http';
import { NotificacionService } from './notificacion.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toasts: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    toasts = { error: vi.fn() };
    configurarHttp([{ provide: NotificacionService, useValue: toasts }]);
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('entrega un ApiError y avisa con un toast', () => {
    let error: unknown;
    http.get(`${API}/planillas`).subscribe({ error: (e) => (error = e) });
    backend
      .expectOne(`${API}/planillas`)
      .flush({ detail: 'No hay planilla.' }, { status: 404, statusText: 'Not Found' });
    expect(error).toBeInstanceOf(ApiError);
    expect(toasts.error).toHaveBeenCalledWith('No hay planilla.');
  });

  it('no muestra toast si la petición maneja su propio error', () => {
    http
      .get(`${API}/x`, { context: new HttpContext().set(OMITIR_TOAST, true) })
      .subscribe({ error: () => undefined });
    backend.expectOne(`${API}/x`).flush({}, { status: 422, statusText: 'Unprocessable' });
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it('un 403 avisa al usuario', () => {
    http.get(`${API}/auditoria`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/auditoria`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(toasts.error).toHaveBeenCalledWith(expect.stringContaining('permiso'));
  });

  it('un corte de red avisa de la falta de conexión', () => {
    http.get(`${API}/x`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/x`).error(new ProgressEvent('error'), { status: 0 });
    expect(toasts.error).toHaveBeenCalledWith(expect.stringContaining('conexión'));
  });
});
