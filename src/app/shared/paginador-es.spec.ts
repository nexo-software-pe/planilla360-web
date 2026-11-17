import { PaginadorEs } from './paginador-es';

describe('PaginadorEs', () => {
  const paginador = new PaginadorEs();

  it('traduce las etiquetas al español', () => {
    expect(paginador.itemsPerPageLabel).toBe('Elementos por página:');
    expect(paginador.nextPageLabel).toBe('Página siguiente');
    expect(paginador.previousPageLabel).toBe('Página anterior');
    expect(paginador.firstPageLabel).toBe('Primera página');
    expect(paginador.lastPageLabel).toBe('Última página');
  });

  it.each([
    [0, 20, 45, '1 – 20 de 45'],
    [2, 20, 45, '41 – 45 de 45'],
    [0, 20, 7, '1 – 7 de 7'],
  ])('rango de la página %i (tamaño %i, total %i)', (pagina, tamano, total, esperado) => {
    expect(paginador.getRangeLabel(pagina, tamano, total)).toBe(esperado);
  });

  it('sin elementos o sin tamaño de página indica 0 de 0', () => {
    expect(paginador.getRangeLabel(0, 20, 0)).toBe('0 de 0');
    expect(paginador.getRangeLabel(0, 0, 10)).toBe('0 de 0');
  });
});
