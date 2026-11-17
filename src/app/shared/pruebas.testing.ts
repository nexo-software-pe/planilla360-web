import { of } from 'rxjs';
import { NotificacionService } from '../core/http/notificacion.service';
import { DialogosService } from './dialogos';

/** Dobles de las dependencias transversales de las pantallas (diálogos y avisos). */
export function dobleDialogos(texto = 'Clave-nueva-123') {
  return {
    confirmar: vi.fn(() => of(true)),
    pedirTexto: vi.fn(() => of(texto)),
  };
}

export function dobleAvisos() {
  return { exito: vi.fn(), error: vi.fn(), info: vi.fn() };
}

/** Proveedores listos para `render(..., { providers })`. */
export function proveedoresTransversales(
  dialogos = dobleDialogos(),
  avisos = dobleAvisos(),
): { providers: unknown[]; dialogos: typeof dialogos; avisos: typeof avisos } {
  return {
    providers: [
      { provide: DialogosService, useValue: dialogos },
      { provide: NotificacionService, useValue: avisos },
    ],
    dialogos,
    avisos,
  };
}
