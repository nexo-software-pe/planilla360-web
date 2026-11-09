import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha } from './fechas';

/** Fechas ISO de la API en formato peruano `dd/MM/yyyy`. */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatearFecha(valor);
  }
}
