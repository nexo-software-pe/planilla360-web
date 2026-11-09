import { aIso, formatearFecha, formatearFechaHora, formatearMinutos, nombreDeMes } from './fechas';

describe('fechas', () => {
  it('aIso usa el día local y no corre la fecha por la zona horaria', () => {
    expect(aIso(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(aIso(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('formatearFecha pasa de ISO a dd/MM/yyyy', () => {
    expect(formatearFecha('2026-11-09')).toBe('09/11/2026');
    expect(formatearFecha('2026-11-09T10:00:00-05:00')).toBe('09/11/2026');
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha('')).toBe('');
  });

  it('formatearFechaHora ignora valores inválidos', () => {
    expect(formatearFechaHora('no-es-fecha')).toBe('');
    expect(formatearFechaHora(undefined)).toBe('');
    expect(formatearFechaHora('2026-11-09T14:05:00')).toBe('09/11/2026 14:05');
  });

  it('nombreDeMes devuelve el mes en español', () => {
    expect(nombreDeMes('2026-11')).toBe('noviembre de 2026');
    expect(nombreDeMes('2026-01')).toBe('enero de 2026');
    expect(nombreDeMes('basura')).toBe('basura');
  });

  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h 00 min'],
    [83, '1 h 23 min'],
  ])('formatearMinutos(%i) = %s', (minutos, esperado) => {
    expect(formatearMinutos(minutos)).toBe(esperado);
  });
});
