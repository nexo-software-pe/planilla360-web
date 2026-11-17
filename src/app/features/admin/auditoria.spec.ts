import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { AdminService, RegistroAuditoria } from './admin.service';
import { Auditoria } from './auditoria';

const registros: RegistroAuditoria[] = [
  {
    id: 'r1',
    entidad: 'Empleado',
    entidadId: 'e1',
    accion: 'ACTUALIZAR',
    usuario: 'rosa@empresa.pe',
    instante: '2026-11-10T09:30:00',
    antes: { nombres: 'Ana' },
    despues: { nombres: 'Ana María' },
  },
  {
    id: 'r2',
    entidad: 'Contrato',
    entidadId: 'k1',
    accion: 'CREAR',
    usuario: null,
    instante: '2026-11-11T10:00:00',
    antes: null,
    despues: { sueldoBasico: 3000 },
  },
];

async function abrir(contenido = registros) {
  const admin = {
    auditoria: vi.fn(() =>
      of({ contenido, pagina: 0, tamano: 20, totalElementos: contenido.length, totalPaginas: 1 }),
    ),
  };
  await render(Auditoria, { providers: [{ provide: AdminService, useValue: admin }] });
  return { admin, persona: userEvent.setup() };
}

describe('Auditoría', () => {
  it('lista los registros y atribuye al sistema los cambios sin usuario', async () => {
    await abrir();
    expect(await screen.findByText('rosa@empresa.pe')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Empleado' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Contrato' })).toBeInTheDocument();
  });

  it('indica cuando no hay registros', async () => {
    await abrir([]);
    expect(
      await screen.findByText('No hay registros de auditoría con estos filtros.'),
    ).toBeInTheDocument();
  });

  it('muestra y oculta el antes y el después de un cambio', async () => {
    const { persona } = await abrir();
    const [primero] = await screen.findAllByRole('button', { name: 'Ver cambios' });
    await persona.click(primero);

    expect(primero).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/"Ana María"/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Antes' })).toBeInTheDocument();

    await persona.click(screen.getByRole('button', { name: 'Ocultar cambios' }));
    expect(screen.queryByRole('heading', { name: 'Antes' })).toBeNull();
  });

  it('un alta no tiene estado anterior', async () => {
    const { persona } = await abrir();
    const botones = await screen.findAllByRole('button', { name: 'Ver cambios' });
    await persona.click(botones[1]);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/"sueldoBasico": 3000/)).toBeInTheDocument();
  });

  it('filtra por entidad tras una breve pausa y vuelve a la primera página', async () => {
    const { admin, persona } = await abrir();
    await persona.type(screen.getByRole('textbox', { name: /Entidad/ }), 'Empleado');

    await waitFor(() =>
      expect(admin.auditoria).toHaveBeenLastCalledWith(
        { entidad: 'Empleado', desde: '', hasta: '' },
        0,
        20,
      ),
    );
  });

  it('limpia los filtros', async () => {
    const { admin, persona } = await abrir();
    await persona.type(screen.getByRole('textbox', { name: /Entidad/ }), 'X');
    await waitFor(() => expect(admin.auditoria).toHaveBeenCalledTimes(2));
    await persona.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() =>
      expect(admin.auditoria).toHaveBeenLastCalledWith(
        { entidad: '', desde: '', hasta: '' },
        0,
        20,
      ),
    );
  });
});
