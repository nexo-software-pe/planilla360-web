import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { cargaInterceptor } from './core/http/carga.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Orden: carga (más externo) → errores → autenticación (más cercano a la red).
    // Así el interceptor de errores ve el resultado final, tras el refresh transparente.
    provideHttpClient(withInterceptors([cargaInterceptor, errorInterceptor, authInterceptor])),
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restaurarSesion())),
  ],
};
