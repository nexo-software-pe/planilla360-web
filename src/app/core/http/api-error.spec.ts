import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';

describe('ApiError.desde', () => {
  it('lee el problem+json de la API', () => {
    const e = ApiError.desde(
      new HttpErrorResponse({
        status: 422,
        error: { title: 'Regla de negocio incumplida', detail: 'La planilla ya está cerrada.' },
      }),
    );
    expect(e.estado).toBe(422);
    expect(e.titulo).toBe('Regla de negocio incumplida');
    expect(e.mensaje).toBe('La planilla ya está cerrada.');
  });

  it('lee los errores por campo', () => {
    const e = ApiError.desde(
      new HttpErrorResponse({
        status: 400,
        error: {
          detail: 'Datos inválidos',
          errores: [{ campo: 'dni', mensaje: 'Debe tener 8 dígitos' }],
        },
      }),
    );
    expect(e.errores).toEqual([{ campo: 'dni', mensaje: 'Debe tener 8 dígitos' }]);
  });

  it('avisa de la falta de conexión cuando el estado es 0', () => {
    const e = ApiError.desde(new HttpErrorResponse({ status: 0 }));
    expect(e.mensaje).toContain('No hay conexión');
  });

  it('no filtra el detalle técnico de un error 500', () => {
    const e = ApiError.desde(
      new HttpErrorResponse({ status: 500, error: { detail: 'NullPointerException en X' } }),
    );
    expect(e.mensaje).not.toContain('NullPointer');
    expect(e.mensaje).toContain('servidor');
  });

  it('usa un mensaje por defecto si el cuerpo no es un problema', () => {
    const e = ApiError.desde(new HttpErrorResponse({ status: 403, error: '<html>' }));
    expect(e.mensaje).toContain('permiso');
  });
});
