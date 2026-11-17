import { descargarBlob } from './descarga';

describe('descargarBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('entrega el archivo con el nombre indicado y libera la URL temporal', () => {
    const blob = new Blob(['contenido']);
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:archivo');
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
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
