import { Provider } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { AdminService } from '../admin/admin.service';
import { CatalogoService } from '../catalogo/catalogo.service';
import { ParametrosLegales } from './parametros-legales';

async function abrir() {
  const admin = {
    parametrosLegales: vi.fn(() =>
      of([
        {
          id: 'p1',
          codigo: 'UIT',
          descripcion: 'Unidad impositiva tributaria',
          valor: 5500,
          vigenteDesde: '2026-01-01',
          vigenteHasta: null,
        },
        {
          id: 'p0',
          codigo: 'UIT',
          descripcion: 'Unidad impositiva tributaria',
          valor: 5350,
          vigenteDesde: '2025-01-01',
          vigenteHasta: '2025-12-31',
        },
      ]),
    ),
    crearParametroLegal: vi.fn(() => of({})),
  };
  const catalogo = {
    afps: () =>
      of([
        {
          id: 'afp1',
          nombre: 'Integra',
          comisionFlujo: 1.55,
          comisionMixta: 0.0125,
          vigenteDesde: '2026-01-01',
        },
      ]),
  };
  const t = proveedoresTransversales();
  await render(ParametrosLegales, {
    providers: [
      { provide: AdminService, useValue: admin },
      { provide: CatalogoService, useValue: catalogo },
      ...(t.providers as Provider[]),
    ],
  });
  return { admin, ...t, persona: userEvent.setup() };
}

describe('Parámetros legales', () => {
  it('distingue el valor vigente del histórico y formatea los números', async () => {
    await abrir();
    expect(await screen.findByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '5500' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '01/01/2026' })).toHaveLength(2); // parámetro y AFP
    expect(screen.getByRole('cell', { name: '31/12/2025' })).toBeInTheDocument();
  });

  it('muestra las comisiones de las AFP como porcentaje con coma decimal', async () => {
    await abrir();
    expect(await screen.findByRole('cell', { name: '1,55 %' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '0,0125 %' })).toBeInTheDocument();
  });

  it('registra un valor vigente nuevo y recarga', async () => {
    const { admin, avisos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo valor vigente' }));
    await persona.type(screen.getByLabelText(/Código/), 'RMV');
    await persona.type(screen.getByLabelText(/Descripción/), ' Remuneración mínima ');
    await persona.type(screen.getByLabelText(/^Valor/), '1130.5');
    fireEvent.input(screen.getByLabelText(/Vigente desde/), { target: { value: '2027-01-01' } });
    await persona.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(admin.crearParametroLegal).toHaveBeenCalledWith({
      codigo: 'RMV',
      descripcion: 'Remuneración mínima',
      valor: 1130.5,
      vigenteDesde: '2027-01-01',
    });
    expect(avisos.exito).toHaveBeenCalledWith('Parámetro registrado.');
    expect(admin.parametrosLegales).toHaveBeenCalledTimes(2);
  });

  it('rechaza un código en minúsculas', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo valor vigente' }));
    await persona.type(screen.getByLabelText(/Código/), 'rmv');
    await persona.type(screen.getByLabelText(/Descripción/), 'Remuneración');
    await persona.type(screen.getByLabelText(/^Valor/), '1130');
    await persona.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(admin.crearParametroLegal).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Código/)).toBeInvalid();
  });

  it('cancelar cierra el formulario', async () => {
    const { persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo valor vigente' }));
    await persona.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo valor vigente' })).toBeNull();
  });
});
