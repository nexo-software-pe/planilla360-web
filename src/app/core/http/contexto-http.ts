import { HttpContextToken } from '@angular/common/http';

/** La petición maneja sus errores en pantalla: el interceptor global no muestra toast. */
export const OMITIR_TOAST = new HttpContextToken<boolean>(() => false);

/** La petición (p. ej. un sondeo) no enciende el indicador global de carga. */
export const OMITIR_CARGA = new HttpContextToken<boolean>(() => false);
