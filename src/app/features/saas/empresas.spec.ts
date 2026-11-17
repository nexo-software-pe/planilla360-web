import { Provider } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { AdminService, Empresa } from '../admin/admin.service';
import { Empresas } from './empresas';

const empresa = (id: string, razonSocial: string, activa: boolean): Empresa => ({
  id,
  ruc: '20601234565',
  razonSocial,
  regimenLaboral: 'GENERAL',
  plan: 'PROFESIONAL',
  activa,
  creadaEn: '2026-03-15T10:00:00',
});

async function abrir(
  contenido = [empresa('e1', 'Textiles S.A.C.', true), empresa('e2', 'Agro S.A.C.', false)],
) {
  const admin = {
    empresas: vi.fn(() =>
      of({ contenido, pagina: 0, tamano: 20, totalElementos: contenido.length, totalPaginas: 1 }),
    ),
    crearEmpresa: vi.fn(() => of(empresa('e3', 'Nueva', true))),
    actualizarEmpresa: vi.fn(() => of(empresa('e1', 'Textiles Andinos', true))),
    cambiarEstadoEmpresa: vi.fn(() => of(empresa('e1', 'Textiles S.A.C.', false))),
  };
  const t = proveedoresTransversales();
  await render(Empresas, {
    providers: [{ provide: AdminService, useValue: admin }, ...(t.providers as Provider[])],
  });
  return { admin, ...t, persona: userEvent.setup() };
}

describe('Empresas', () => {
  it('lista las empresas con régimen, plan y estado', async () => {
    await abrir();
    expect(await screen.findByText('Textiles S.A.C.')).toBeInTheDocument();
    expect(screen.getAllByText('Profesional')).toHaveLength(2);
    expect(screen.getAllByText('Régimen general')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Desactivar Textiles S.A.C.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar Agro S.A.C.' })).toBeInTheDocument();
  });

  it('indica cuando no hay empresas', async () => {
    await abrir([]);
    expect(await screen.findByText('No hay empresas con este filtro.')).toBeInTheDocument();
  });

  it('filtra por estado y vuelve a pedir la primera página', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('combobox', { name: 'Estado' }));
    await persona.click(await screen.findByRole('option', { name: 'Activas' }));
    expect(admin.empresas).toHaveBeenLastCalledWith(0, 20, true);
  });

  it('crea una empresa con un RUC válido', async () => {
    const { admin, avisos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nueva empresa' }));
    await persona.type(screen.getByRole('textbox', { name: /RUC/ }), '20601234565');
    await persona.type(screen.getByRole('textbox', { name: /Razón social/ }), ' Nueva S.A.C. ');
    await persona.click(screen.getByRole('button', { name: 'Crear empresa' }));

    expect(admin.crearEmpresa).toHaveBeenCalledWith({
      ruc: '20601234565',
      razonSocial: 'Nueva S.A.C.',
      regimenLaboral: 'GENERAL',
      plan: 'BASICO',
    });
    expect(avisos.exito).toHaveBeenCalledWith('Empresa creada.');
  });

  it('rechaza un RUC con dígito verificador incorrecto', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nueva empresa' }));
    await persona.type(screen.getByRole('textbox', { name: /RUC/ }), '20601234566');
    await persona.type(screen.getByRole('textbox', { name: /Razón social/ }), 'Nueva S.A.C.');
    await persona.click(screen.getByRole('button', { name: 'Crear empresa' }));

    expect(admin.crearEmpresa).not.toHaveBeenCalled();
    expect(await screen.findByRole('textbox', { name: /RUC/ })).toBeInvalid();
  });

  it('edita una empresa', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Editar Textiles S.A.C.' }));
    const campo = screen.getByRole('textbox', { name: /Razón social/ });
    expect(campo).toHaveValue('Textiles S.A.C.');
    await persona.clear(campo);
    await persona.type(campo, 'Textiles Andinos');
    await persona.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(admin.actualizarEmpresa).toHaveBeenCalledWith('e1', {
      ruc: '20601234565',
      razonSocial: 'Textiles Andinos',
      regimenLaboral: 'GENERAL',
      plan: 'PROFESIONAL',
    });
  });

  it('desactiva tras confirmar y activa sin preguntar', async () => {
    const { admin, dialogos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Desactivar Textiles S.A.C.' }));
    expect(dialogos.confirmar).toHaveBeenCalledTimes(1);
    expect(admin.cambiarEstadoEmpresa).toHaveBeenCalledWith('e1', false);

    await persona.click(screen.getByRole('button', { name: 'Activar Agro S.A.C.' }));
    expect(dialogos.confirmar).toHaveBeenCalledTimes(1);
    expect(admin.cambiarEstadoEmpresa).toHaveBeenCalledWith('e2', true);
  });
});
