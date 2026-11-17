import { descargarBlob } from './descarga';

describe('descargarBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('entrega el archivo con el nombre indicado y libera la URL temporal', () => {
    const blob = new Blob(['contenido']);
    const crear = vi.fn(() => 'blob:archivo');
    const revocar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }));
    const entregas: { descarga: string; destino: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      entregas.push({ descarga: this.download, destino: this.href });
    });

    descargarBlob(blob, 'planilla.xlsx');

    expect(crear).toHaveBeenCalledWith(blob);
    expect(entregas).toEqual([{ descarga: 'planilla.xlsx', destino: 'blob:archivo' }]);
    expect(revocar).toHaveBeenCalledWith('blob:archivo');
  });
});
