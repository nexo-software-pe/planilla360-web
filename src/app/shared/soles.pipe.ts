import { Pipe, PipeTransform } from '@angular/core';

/** Montos en soles con formato peruano: `S/ 3 022,80`. Único lugar donde se formatea dinero. */
@Pipe({ name: 'soles' })
export class SolesPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '';
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '';
    const [entera, decimales] = Math.abs(numero).toFixed(2).split('.');
    const agrupada = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const signo = numero < 0 && Number(`${entera}.${decimales}`) !== 0 ? '-' : '';
    return `${signo}S/ ${agrupada},${decimales}`;
  }
}
