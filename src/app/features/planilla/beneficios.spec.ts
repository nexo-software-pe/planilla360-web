import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosService } from '../empleados/empleados.service';
import { Beneficios } from './beneficios';
import { LineaPlanilla, PlanillaService, ResultadoBeneficio } from './planilla.service';

const linea = (empleadoId: string, valor: number): LineaPlanilla =>
  ({
    empleadoId,
    gratificacion: valor,
    cts: valor,
    bonificacionExtraordinaria: 90,
    neto: valor + 90,
  }) as LineaPlanilla;

const resultado = (tipo: 'GRATIFICACION' | 'CTS', periodo: string, id?: string) =>
  ({
    id,
    periodo,
    tipo,
    trabajadores: 2,
    totalNeto: 2180,
    lineas: [linea('e1', 1000), linea('e9', 0)],
  }) as ResultadoBeneficio;

async function abrir() {
  const planilla = {
    beneficio: vi.fn((tipo: 'GRATIFICACION' | 'CTS', periodo: string, simular: boolean) =>
      of(resultado(tipo, periodo, simular ? undefined : 'p77')),
    ),
  };
  const empleados = {
    directorio: () => of([{ id: 'e1', nombres: 'Ana', apellidos: 'Quispe' }]),
  };
  const t = proveedoresTransversales();
  await render(Beneficios, {
    providers: [
      { provide: PlanillaService, useValue: planilla },
      { provide: EmpleadosService, useValue: empleados },
      ...(t.providers as Provider[]),
    ],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { planilla, navegar, ...t, persona: userEvent.setup() };
}

describe('Gratificación y CTS', () => {
  beforeEach(() => {
    // 16/11/2026: la última gratificación vencida es la de julio y la CTS, la de noviembre
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 16, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('sugiere el último mes en que corresponde el beneficio', async () => {
    const { persona } = await abrir();
    expect(screen.getByLabelText(/Periodo/)).toHaveValue('2026-07');
    expect(screen.getByText('Se paga en julio y diciembre.')).toBeInTheDocument();

    await persona.click(screen.getByRole('combobox', { name: /Beneficio/ }));
    await persona.click(await screen.findByRole('option', { name: 'CTS' }));
    expect(screen.getByLabelText(/Periodo/)).toHaveValue('2026-11');
    expect(screen.getByText('Se deposita en mayo y noviembre.')).toBeInTheDocument();
  });

  it('simula la gratificación y muestra el detalle por trabajador', async () => {
    const { planilla, persona } = await abrir();
    await persona.click(screen.getByRole('button', { name: 'Simular' }));

    expect(planilla.beneficio).toHaveBeenCalledWith('GRATIFICACION', '2026-07', true);
    expect(
      await screen.findByRole('heading', { name: 'Simulación de gratificación de julio de 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Incluye bonificación extraordinaria de ley')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Quispe, Ana' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Trabajador' })).toBeInTheDocument(); // sin ficha
    expect(screen.getByRole('columnheader', { name: 'Bonif. extraordinaria' })).toBeInTheDocument();
  });

  it('la CTS no muestra la bonificación extraordinaria', async () => {
    const { persona } = await abrir();
    await persona.click(screen.getByRole('combobox', { name: /Beneficio/ }));
    await persona.click(await screen.findByRole('option', { name: 'CTS' }));
    await persona.click(screen.getByRole('button', { name: 'Simular' }));

    expect(await screen.findByRole('heading', { name: /Simulación de CTS/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Bonif. extraordinaria' })).toBeNull();
  });

  it('rechaza un mes en que no corresponde el beneficio', async () => {
    const { planilla, persona } = await abrir();
    fireEvent.input(screen.getByLabelText(/Periodo/), { target: { value: '2026-08' } });
    await persona.click(screen.getByRole('button', { name: 'Simular' }));

    expect(planilla.beneficio).not.toHaveBeenCalled();
    expect(
      await screen.findByText('La gratificación corresponde a julio o diciembre.'),
    ).toBeInTheDocument();
  });

  it('rechaza un periodo futuro', async () => {
    const { planilla, persona } = await abrir();
    fireEvent.input(screen.getByLabelText(/Periodo/), { target: { value: '2026-12' } });
    await persona.click(screen.getByRole('button', { name: 'Simular' }));

    expect(planilla.beneficio).not.toHaveBeenCalled();
    expect(await screen.findByText('No puedes trabajar un periodo futuro.')).toBeInTheDocument();
  });

  it('genera la planilla tras confirmar y abre su detalle', async () => {
    const { planilla, dialogos, avisos, navegar, persona } = await abrir();
    await persona.click(screen.getByRole('button', { name: 'Simular' }));
    await persona.click(await screen.findByRole('button', { name: 'Generar planilla' }));

    expect(dialogos.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: expect.stringContaining('gratificación de julio de 2026 por 2 trabajadores'),
      }),
    );
    expect(planilla.beneficio).toHaveBeenLastCalledWith('GRATIFICACION', '2026-07', false);
    expect(avisos.exito).toHaveBeenCalledWith('Planilla generada.');
    expect(navegar).toHaveBeenCalledWith(['/panel/planilla', 'p77']);
  });
});
