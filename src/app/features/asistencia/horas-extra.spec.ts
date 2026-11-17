import { Provider } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosService } from '../empleados/empleados.service';
import { AsistenciaService, HoraExtra } from './asistencia.service';
import { HorasExtra } from './horas-extra';

const hora = (id: string, empleadoId: string, estado: HoraExtra['estado']): HoraExtra => ({
  id,
  empleadoId,
  fecha: '2026-11-05',
  horas: 2.5,
  motivo: estado === 'PENDIENTE' ? 'Cierre de mes' : null,
  estado,
  aprobadoPor: null,
});

async function abrir(
  filas: HoraExtra[] = [hora('h1', 'e1', 'PENDIENTE'), hora('h2', 'e9', 'APROBADA')],
) {
  const servicio = {
    horasExtra: vi.fn(() => of(filas)),
    resolverHoraExtra: vi.fn(() => of(hora('h1', 'e1', 'APROBADA'))),
  };
  const empleados = {
    directorio: () => of([{ id: 'e1', nombres: 'Ana', apellidos: 'Quispe' }]),
  };
  const t = proveedoresTransversales();
  await render(HorasExtra, {
    providers: [
      { provide: AsistenciaService, useValue: servicio },
      { provide: EmpleadosService, useValue: empleados },
      ...(t.providers as Provider[]),
    ],
  });
  return { servicio, ...t, persona: userEvent.setup() };
}

describe('Horas extra', () => {
  it('pide por defecto las pendientes y muestra empleado, motivo y estado', async () => {
    const { servicio } = await abrir();
    expect(await screen.findByText('Quispe, Ana')).toBeInTheDocument();
    expect(servicio.horasExtra).toHaveBeenCalledWith('PENDIENTE');
    expect(screen.getByText('Cierre de mes')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Empleado' })).toBeInTheDocument(); // sin ficha en el directorio
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument(); // sin motivo
    expect(screen.getAllByText('05/11/2026')).toHaveLength(2);
  });

  it('solo las pendientes se pueden resolver', async () => {
    await abrir();
    await screen.findByText('Quispe, Ana');
    expect(screen.getAllByRole('button', { name: /^Aprobar horas extra/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Rechazar horas extra/ })).toHaveLength(1);
  });

  it('indica cuando no hay solicitudes', async () => {
    await abrir([]);
    expect(
      await screen.findByText('No hay solicitudes de horas extra con este estado.'),
    ).toBeInTheDocument();
  });

  it('aprueba una solicitud y recarga la lista', async () => {
    const { servicio, avisos, persona } = await abrir();
    await persona.click(
      await screen.findByRole('button', { name: 'Aprobar horas extra de Quispe, Ana' }),
    );

    expect(servicio.resolverHoraExtra).toHaveBeenCalledWith('h1', 'APROBAR');
    expect(avisos.exito).toHaveBeenCalledWith('Horas extra aprobadas.');
    expect(servicio.horasExtra).toHaveBeenCalledTimes(2);
  });

  it('rechaza una solicitud solo tras confirmar', async () => {
    const { servicio, dialogos, avisos, persona } = await abrir();
    await persona.click(
      await screen.findByRole('button', { name: 'Rechazar horas extra de Quispe, Ana' }),
    );

    expect(dialogos.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.stringContaining('2.5 h de Quispe, Ana') }),
    );
    expect(servicio.resolverHoraExtra).toHaveBeenCalledWith('h1', 'RECHAZAR');
    expect(avisos.exito).toHaveBeenCalledWith('Horas extra rechazadas.');
  });

  it('filtra por estado', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('combobox', { name: 'Estado' }));
    await persona.click(await screen.findByRole('option', { name: 'Aprobadas' }));
    expect(servicio.horasExtra).toHaveBeenLastCalledWith('APROBADA');

    await persona.click(screen.getByRole('combobox', { name: 'Estado' }));
    await persona.click(await screen.findByRole('option', { name: 'Todas' }));
    expect(servicio.horasExtra).toHaveBeenLastCalledWith(undefined);
  });
});
