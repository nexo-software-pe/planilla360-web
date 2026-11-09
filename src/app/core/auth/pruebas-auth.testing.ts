import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../config/api-url';
import { cargaInterceptor } from '../http/carga.interceptor';
import { errorInterceptor } from '../http/error.interceptor';
import { authInterceptor } from './auth.interceptor';
import { Perfil, TokenResponse, Usuario } from './auth.models';
import { AuthService } from './auth.service';

/** Utilidades compartidas por las pruebas de autenticación. */
export const API = 'http://api.test/api/v1';

export const USUARIO_RRHH: Usuario = {
  id: 'u1',
  email: 'rrhh@empresa.pe',
  nombre: 'Rosa RRHH',
  rol: 'RRHH',
};

export function tokens(
  access: string,
  refresh: string,
  usuario: Usuario = USUARIO_RRHH,
): TokenResponse {
  return {
    accessToken: access,
    refreshToken: refresh,
    expiraEnSegundos: 900,
    tokenType: 'Bearer',
    usuario,
  };
}

export function perfil(usuario: Usuario = USUARIO_RRHH): Perfil {
  return {
    usuario,
    empresa: { id: 'e1', razonSocial: 'Textiles Andinos S.A.C.', ruc: '20123456789' },
  };
}

/** Configura HttpClient con los interceptores reales y una API falsa. */
export function configurarHttp(extra: Provider[] = []): void {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([cargaInterceptor, errorInterceptor, authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
      ...extra,
    ],
  });
}

/** Inicia sesión contra la API falsa y deja al servicio autenticado. */
export function iniciarSesionFalsa(
  usuario: Usuario = USUARIO_RRHH,
  access = 'acc-1',
  refresh = 'ref-1',
): void {
  const http = TestBed.inject(HttpTestingController);
  TestBed.inject(AuthService).iniciarSesion(usuario.email, 'secreta').subscribe();
  http.expectOne(`${API}/auth/login`).flush(tokens(access, refresh, usuario));
  http.expectOne(`${API}/auth/me`).flush(perfil(usuario));
}
