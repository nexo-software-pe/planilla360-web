import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { API_URL } from '../core/config/api-url';

export const API_PRUEBA = 'http://api.test/api/v1';

/** Caso de una prueba de servicio HTTP: qué se llama y qué petición debe salir. */
export interface CasoHttp<S> {
  nombre: string;
  llamar: (servicio: S) => Observable<unknown>;
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Ruta con query string, sin la URL base. */
  ruta: string;
  cuerpo?: unknown;
  respuesta?: unknown;
}

export function montarServicio<S>(token: Type<S>): { servicio: S; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API_PRUEBA },
    ],
  });
  return { servicio: TestBed.inject(token), http: TestBed.inject(HttpTestingController) };
}

/** Ejecuta cada caso y verifica método, URL, cuerpo y que la respuesta llegue al suscriptor. */
export function probarPeticiones<S>(token: Type<S>, casos: CasoHttp<S>[]): void {
  describe('peticiones HTTP', () => {
    it.each(casos)('$nombre', (caso) => {
      const { servicio, http } = montarServicio(token);
      const recibido: unknown[] = [];
      caso.llamar(servicio).subscribe((r) => recibido.push(r));

      const req = http.expectOne(`${API_PRUEBA}${caso.ruta}`);
      expect(req.request.method).toBe(caso.metodo);
      if (caso.cuerpo !== undefined) expect(req.request.body).toEqual(caso.cuerpo);
      const respuesta = caso.respuesta ?? { ok: true };
      req.flush(respuesta);

      expect(recibido).toEqual([respuesta]);
      http.verify();
    });
  });
}
