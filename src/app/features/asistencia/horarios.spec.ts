import { Provider } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosService } from '../empleados/empleados.service';
import { AsistenciaService, Horario } from './asistencia.service';
import { Horarios } from './horarios';

const oficina: Horario = {
  id: 'h1',
  nombre: 'Oficina',
  entrada: '08:00:00',
  salida: '17:00:00',
  toleranciaMin: 10,
  refrigerioMin: 60,
  dias: ['MONDAY', 'TUESDAY', 'FRIDAY'],
};

async function abrir(horarios: Horario[] = [oficina]) {
  const servicio = {
    horarios: vi.fn(() => of(horarios)),
    crearHorario: vi.fn(() => of(oficina)),
    asignarHorario: vi.fn(() => of(undefined)),
  };
  const empleados = {
    directorio: () => of([{ id: 'e1', nombres: 'Ana', apellidos: 'Quispe' }]),
  };
  const t = proveedoresTransversales();
  await render(Horarios, {
    providers: [
      { provide: AsistenciaService, useValue: servicio },
      { provide: EmpleadosService, useValue: empleados },
      ...(t.providers as Provider[]),
    ],
  });
  return { servicio, ...t, persona: userEvent.setup() };
}

describe('Horarios', () => {
  it('lista los horarios con sus horas y días abreviados', async () => {
    await abrir();
    expect(await screen.findByText('Oficina')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '08:00' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '17:00' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '10 min' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Lun, Mar, Vie' })).toBeInTheDocument();
  });

  it('invita a crear el primer horario cuando no hay ninguno', async () => {
    await abrir([]);
    expect(await screen.findByText(/Aún no hay horarios/)).toBeInTheDocument();
  });

  it('crea un horario de lunes a viernes por defecto', async () => {
    const { servicio, avisos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo horario' }));
    await persona.type(screen.getByRole('textbox', { name: /Nombre/ }), ' Turno mañana ');
    await persona.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(servicio.crearHorario).toHaveBeenCalledWith({
      nombre: 'Turno mañana',
      entrada: '08:00',
      salida: '17:00',
      toleranciaMin: 5,
      refrigerioMin: 60,
      dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    });
    expect(avisos.exito).toHaveBeenCalledWith('Horario creado.');
  });

  it('permite marcar el sábado y desmarcar el viernes', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo horario' }));
    await persona.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Retail');
    await persona.click(screen.getByRole('checkbox', { name: 'Sábado' }));
    await persona.click(screen.getByRole('checkbox', { name: 'Viernes' }));
    await persona.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(servicio.crearHorario).toHaveBeenCalledWith(
      expect.objectContaining({ dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY'] }),
    );
  });

  it('exige al menos un día laborable', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo horario' }));
    await persona.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Vacío');
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) {
      await persona.click(screen.getByRole('checkbox', { name: dia }));
    }
    await persona.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(servicio.crearHorario).not.toHaveBeenCalled();
    expect(await screen.findByText('Elige al menos un día.')).toBeInTheDocument();
  });

  it('la salida debe ser posterior a la entrada', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo horario' }));
    await persona.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Raro');
    fireEvent.input(screen.getByLabelText(/Hora de salida/), { target: { value: '07:00' } });
    await persona.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(servicio.crearHorario).not.toHaveBeenCalled();
    expect(
      await screen.findByText('La salida debe ser posterior a la entrada.'),
    ).toBeInTheDocument();
  });

  it('cancelar cierra el formulario sin crear nada', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo horario' }));
    await persona.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo horario' })).toBeNull();
    expect(servicio.crearHorario).not.toHaveBeenCalled();
  });

  it('asigna un horario a un empleado desde una fecha', async () => {
    const { servicio, avisos, persona } = await abrir();
    await persona.click(
      await screen.findByRole('button', { name: 'Asignar el horario Oficina a un empleado' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Asignar «Oficina» a un empleado' }),
    ).toBeInTheDocument();
    await persona.click(screen.getByRole('combobox', { name: /Empleado/ }));
    await persona.click(await screen.findByRole('option', { name: 'Quispe, Ana' }));
    fireEvent.input(screen.getByLabelText(/Vigente desde/), { target: { value: '2026-12-01' } });
    await persona.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(servicio.asignarHorario).toHaveBeenCalledWith('h1', 'e1', '2026-12-01');
    expect(avisos.exito).toHaveBeenCalledWith('Horario asignado.');
  });

  it('no asigna sin elegir empleado', async () => {
    const { servicio, persona } = await abrir();
    await persona.click(
      await screen.findByRole('button', { name: 'Asignar el horario Oficina a un empleado' }),
    );
    await persona.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(servicio.asignarHorario).not.toHaveBeenCalled();
  });
});
