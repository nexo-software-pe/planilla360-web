import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { Planilla, PlanillaService } from './planilla.service';
import { PlanillaLista } from './planilla-lista';

const planilla = (id: string, estado: Planilla['estado'], tipo: Planilla['tipo']): Planilla => ({
  id,
  periodo: '2026-10',
  tipo,
  estado,
  trabajadores: 12,
  totalIngresos: 40000,
  totalDescuentos: 5000,
  totalNeto: 35000,
  totalEssalud: 3600,
  cerradaEn: null,
});

async function abrir(contenido: Planilla[]) {
  const servicio = {
    listar: vi.fn(() =>
      of({ contenido, pagina: 0, tamano: 20, totalElementos: contenido.length, totalPaginas: 1 }),
    ),
    crear: vi.fn(() => of(planilla('nueva', 'BORRADOR', 'MENSUAL'))),
  };
  await render(PlanillaLista, {
    providers: [provideRouter([]), { provide: PlanillaService, useValue: servicio }],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { servicio, navegar, persona: userEvent.setup() };
}

describe('Lista de planillas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 16, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('muestra periodo, tipo, estado y montos de cada planilla', async () => {
    await abrir([planilla('p1', 'CERRADA', 'MENSUAL'), planilla('p2', 'BORRADOR', 'CTS')]);
    expect(await screen.findAllByText('octubre de 2026')).toHaveLength(2);
    expect(screen.getByText('Cerrada')).toBeInTheDocument();
    expect(screen.getByText('CTS')).toBeInTheDocument();
    expect(screen.getAllByText(/35\s?000/)).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'Abrir la planilla CTS de octubre de 2026' }),
    ).toHaveAttribute('href', '/p2');
  });

  it('indica cuando no hay planillas', async () => {
    await abrir([]);
    expect(await screen.findByText('No hay planillas con estos filtros.')).toBeInTheDocument();
  });

  it('filtra y limpia los filtros', async () => {
    const { servicio, persona } = await abrir([]);
    await persona.click(screen.getByRole('combobox', { name: 'Estado' }));
    await persona.click(await screen.findByRole('option', { name: 'Cerrada' }));
    await persona.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(servicio.listar).toHaveBeenLastCalledWith(
      { periodo: '', tipo: '', estado: 'CERRADA' },
      0,
      20,
    );

    await persona.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(servicio.listar).toHaveBeenLastCalledWith({ periodo: '', tipo: '', estado: '' }, 0, 20);
  });

  it('crea la planilla del mes y abre su detalle', async () => {
    const { servicio, navegar, persona } = await abrir([]);
    await persona.click(screen.getByRole('button', { name: 'Nueva planilla' }));
    expect(screen.getByRole('heading', { name: 'Nueva planilla mensual' })).toBeInTheDocument();
    await persona.click(screen.getByRole('button', { name: 'Crear planilla' }));

    expect(servicio.crear).toHaveBeenCalledWith('2026-11');
    expect(navegar).toHaveBeenCalledWith(['/panel/planilla', 'nueva']);
  });

  it('no crea una planilla de un mes futuro', async () => {
    const { servicio, persona } = await abrir([]);
    await persona.click(screen.getByRole('button', { name: 'Nueva planilla' }));
    const campo = screen.getAllByLabelText(/Periodo/)[0];
    await persona.clear(campo);
    campo.setAttribute('value', '2027-01');
    (campo as HTMLInputElement).value = '2027-01';
    campo.dispatchEvent(new Event('input'));
    await persona.click(screen.getByRole('button', { name: 'Crear planilla' }));

    expect(servicio.crear).not.toHaveBeenCalled();
    expect(
      await screen.findByText('No puedes crear una planilla de un mes futuro.'),
    ).toBeInTheDocument();
  });
});
