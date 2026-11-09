import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API (`/api/v1`). Se inyecta para poder cambiarla en las pruebas. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
