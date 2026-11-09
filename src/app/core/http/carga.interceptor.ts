import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { CargaService } from './carga.service';
import { OMITIR_CARGA } from './contexto-http';

export const cargaInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(OMITIR_CARGA)) return next(req);
  const carga = inject(CargaService);
  carga.iniciar();
  return next(req).pipe(finalize(() => carga.terminar()));
};
