import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { DialogoTexto } from './dialogos';

async function abrir(tipo: 'text' | 'password' = 'text') {
  const cerrar = vi.fn();
  await render(DialogoTexto, {
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          titulo: 'Rechazar solicitud',
          etiqueta: 'Motivo del rechazo',
          accion: 'Rechazar',
          tipo,
        },
      },
      { provide: MatDialogRef, useValue: { close: cerrar } },
    ],
  });
  return { cerrar, usuario: userEvent.setup() };
}

describe('DialogoTexto', () => {
  it('no se cierra ni envía el formulario si el texto está vacío', async () => {
    const { cerrar, usuario } = await abrir();
    const enviado = vi.fn();
    document.addEventListener('submit', (e) => enviado(e.defaultPrevented), { once: true });

    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(cerrar).not.toHaveBeenCalled();
    expect(await screen.findByText('Este campo es obligatorio.')).toBeInTheDocument();
    // el envío nativo del formulario recargaría la página: debe quedar cancelado
    expect(enviado).toHaveBeenCalledWith(true);
  });

  it('devuelve el texto sin espacios sobrantes', async () => {
    const { cerrar, usuario } = await abrir();
    await usuario.type(screen.getByLabelText('Motivo del rechazo'), '  Sin cobertura  ');
    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(cerrar).toHaveBeenCalledWith('Sin cobertura');
  });

  it('una contraseña débil no se acepta', async () => {
    const { cerrar, usuario } = await abrir('password');
    await usuario.type(screen.getByLabelText('Motivo del rechazo'), 'corta');
    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(cerrar).not.toHaveBeenCalled();
  });
});
