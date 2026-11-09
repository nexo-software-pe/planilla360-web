import { CargaService } from './carga.service';

describe('CargaService', () => {
  it('está activa mientras haya peticiones pendientes', () => {
    const carga = new CargaService();
    expect(carga.activa()).toBe(false);
    carga.iniciar();
    carga.iniciar();
    carga.terminar();
    expect(carga.activa()).toBe(true);
    carga.terminar();
    expect(carga.activa()).toBe(false);
  });

  it('no baja de cero', () => {
    const carga = new CargaService();
    carga.terminar();
    carga.iniciar();
    expect(carga.activa()).toBe(true);
  });
});
