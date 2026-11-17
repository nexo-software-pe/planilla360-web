import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { CatalogoService } from '../catalogo/catalogo.service';
import { Contrato, EmpleadosService } from './empleados.service';
import { FichaContratos } from './ficha-contratos';

const contrato: Contrato = {
  id: 'k1',
  empleadoId: 'e1',
  tipo: 'PLAZO_FIJO',
  fechaInicio: '2026-01-01',
  fechaFin: '2026-12-31',
  sueldoBasico: 3022.8,
  jornadaSemanal: 48,
  diasLaborables: 6,
  regimenPensionario: 'AFP',
  afpId: 'afp1',
  tipoComision: 'FLUJO',
  cuspp: null,
};

async function abrir(contratos: Contrato[] = [contrato], cesado = false) {
  const servicio = {
    contratos: vi.fn(() => of(contratos)),
    crearContrato: vi.fn(() => of(contrato)),
  };
  const catalogo = {
    afps: () =>
      of([
        {
          id: 'afp1',
          nombre: 'Integra',
          comisionFlujo: 1.5,
          comisionMixta: 1,
          vigenteDesde: '2026-01-01',
        },
      ]),
  };
  const t = proveedoresTransversales();
  TestBed.configureTestingModule({
    providers: [
      { provide: EmpleadosService, useValue: servicio },
      { provide: CatalogoService, useValue: catalogo },
      ...(t.providers as Provider[]),
    ],
  });
  // la ficha carga sus datos en una microtarea: los inputs deben fijarse en el mismo turno
  const fixture = TestBed.createComponent(FichaContratos);
  fixture.componentRef.setInput('empleadoId', 'e1');
  fixture.componentRef.setInput('cesado', cesado);
  fixture.detectChanges();
  await fixture.whenStable();
  return { servicio, ...t, persona: userEvent.setup() };
}

const llenarBasico = async (persona: ReturnType<typeof userEvent.setup>, inicio = '2026-03-01') => {
  fireEvent.input(screen.getByLabelText(/Inicio/), { target: { value: inicio } });
  await persona.type(screen.getByLabelText(/Sueldo básico/), '2500');
};

describe('Contratos del empleado', () => {
  it('lista los contratos con vigencia, sueldo y pensión', async () => {
    await abrir();
    expect(await screen.findByText('Plazo fijo')).toBeInTheDocument();
    expect(screen.getByText(/01\/01\/2026/)).toHaveTextContent('31/12/2026');
    expect(screen.getByText(/3\s?022,80/)).toBeInTheDocument();
    expect(screen.getByText('48 h · 6 días')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'AFP' })).toBeInTheDocument();
  });

  it('un contrato sin fecha de fin figura como indefinido', async () => {
    await abrir([{ ...contrato, tipo: 'INDEFINIDO', fechaFin: null, regimenPensionario: 'ONP' }]);
    expect(await screen.findByText(/indefinido$/)).toBeInTheDocument();
  });

  it('avisa que sin contrato no entra en la planilla', async () => {
    await abrir([]);
    expect(await screen.findByText(/Sin contrato no entra en la planilla/)).toBeInTheDocument();
  });

  it('no ofrece registrar contratos de un empleado cesado', async () => {
    await abrir([contrato], true);
    await screen.findByText('Plazo fijo');
    expect(screen.queryByRole('button', { name: 'Nuevo contrato' })).toBeNull();
  });

  it('registra un contrato con ONP', async () => {
    const { servicio, avisos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo contrato' }));
    await llenarBasico(persona);
    await persona.click(screen.getByRole('button', { name: 'Guardar contrato' }));

    expect(servicio.crearContrato).toHaveBeenCalledWith('e1', {
      tipo: 'INDEFINIDO',
      fechaInicio: '2026-03-01',
      fechaFin: null,
      sueldoBasico: 2500,
      jornadaSemanal: 48,
      diasLaborables: 5,
      regimenPensionario: 'ONP',
      afpId: null,
      tipoComision: null,
      cuspp: null,
    });
    expect(avisos.exito).toHaveBeenCalledWith('Contrato registrado.');
    expect(servicio.contratos).toHaveBeenCalledTimes(2);
  });

  it('con AFP exige la AFP y la comisión, y las envía', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo contrato' }));
    await llenarBasico(persona);
    await persona.click(screen.getByRole('combobox', { name: /Régimen pensionario/ }));
    await persona.click(await screen.findByRole('option', { name: 'AFP' }));

    await persona.click(screen.getByRole('button', { name: 'Guardar contrato' }));
    expect(servicio.crearContrato).not.toHaveBeenCalled();

    await persona.click(screen.getByRole('combobox', { name: /^AFP/ }));
    await persona.click(await screen.findByRole('option', { name: 'Integra' }));
    await persona.click(screen.getByRole('combobox', { name: /Tipo de comisión/ }));
    await persona.click(await screen.findByRole('option', { name: 'Mixta' }));
    await persona.type(screen.getByLabelText(/CUSPP/), '123456ABCDEF');
    await persona.click(screen.getByRole('button', { name: 'Guardar contrato' }));

    expect(servicio.crearContrato).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        regimenPensionario: 'AFP',
        afpId: 'afp1',
        tipoComision: 'MIXTA',
        cuspp: '123456ABCDEF',
      }),
    );
  });

  it('un plazo fijo no puede terminar antes de empezar', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo contrato' }));
    await persona.click(screen.getByRole('combobox', { name: /Tipo de contrato/ }));
    await persona.click(await screen.findByRole('option', { name: 'Plazo fijo' }));
    await llenarBasico(persona, '2026-06-01');
    fireEvent.input(screen.getByLabelText(/Fin/), { target: { value: '2026-05-01' } });
    await persona.click(screen.getByRole('button', { name: 'Guardar contrato' }));

    expect(servicio.crearContrato).not.toHaveBeenCalled();
    expect(await screen.findByText('El fin no puede ser anterior al inicio.')).toBeInTheDocument();
  });

  it('cancelar cierra el formulario sin guardar', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo contrato' }));
    await persona.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo contrato' })).toBeNull();
    expect(servicio.crearContrato).not.toHaveBeenCalled();
  });
});
