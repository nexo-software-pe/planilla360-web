import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DialogoConfirmar, DialogoTexto, DialogosService } from './dialogos';

function montar(resultado: unknown) {
  const open = vi.fn(() => ({ afterClosed: () => of(resultado) }));
  TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] });
  return { servicio: TestBed.inject(DialogosService), open };
}

describe('DialogosService', () => {
  const confirmacion = { titulo: 'Cerrar', mensaje: '¿Seguro?', accion: 'Cerrar' };
  const peticion = { titulo: 'Motivo', etiqueta: 'Motivo', accion: 'Enviar' };

  it('confirmar emite true solo cuando la persona acepta', () => {
    const { servicio, open } = montar(true);
    const emitidos: boolean[] = [];
    servicio.confirmar(confirmacion).subscribe((v) => emitidos.push(v));
    expect(emitidos).toEqual([true]);
    expect(open).toHaveBeenCalledWith(DialogoConfirmar, { data: confirmacion });
  });

  it.each([false, undefined])('confirmar no emite si se cancela (%s)', (valor) => {
    const { servicio } = montar(valor);
    const emitidos: boolean[] = [];
    servicio.confirmar(confirmacion).subscribe((v) => emitidos.push(v));
    expect(emitidos).toEqual([]);
  });

  it('pedirTexto emite el texto ingresado', () => {
    const { servicio, open } = montar('Sin cobertura');
    const emitidos: string[] = [];
    servicio.pedirTexto(peticion).subscribe((v) => emitidos.push(v));
    expect(emitidos).toEqual(['Sin cobertura']);
    expect(open).toHaveBeenCalledWith(DialogoTexto, { data: peticion });
  });

  it.each(['', undefined])('pedirTexto no emite si se cancela (%s)', (valor) => {
    const { servicio } = montar(valor);
    const emitidos: string[] = [];
    servicio.pedirTexto(peticion).subscribe((v) => emitidos.push(v));
    expect(emitidos).toEqual([]);
  });
});
