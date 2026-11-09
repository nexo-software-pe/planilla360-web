import { SolesPipe } from './soles.pipe';

describe('SolesPipe', () => {
  const pipe = new SolesPipe();

  it.each([
    [3022.8, 'S/ 3 022,80'],
    [0, 'S/ 0,00'],
    [12.5, 'S/ 12,50'],
    [999.99, 'S/ 999,99'],
    [1000, 'S/ 1 000,00'],
    [1234567.891, 'S/ 1 234 567,89'],
    ['3022.80', 'S/ 3 022,80'],
    [-1500.5, '-S/ 1 500,50'],
  ])('formatea %s como %s', (valor, esperado) => {
    expect(pipe.transform(valor)).toBe(esperado);
  });

  it.each([null, undefined, '', 'abc', NaN])('devuelve vacío para %s', (valor) => {
    expect(pipe.transform(valor as never)).toBe('');
  });

  it('no muestra signo en un negativo que redondea a cero', () => {
    expect(pipe.transform(-0.001)).toBe('S/ 0,00');
  });
});
