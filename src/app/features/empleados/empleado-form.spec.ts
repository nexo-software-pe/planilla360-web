import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CatalogoService } from '../catalogo/catalogo.service';
import { EmpleadoForm } from './empleado-form';
import { EmpleadosService } from './empleados.service';

async function abrir() {
  const servicio = {
    directorio: () => of([]),
    crear: vi.fn(() => of({ id: 'nuevo-1' })),
    consultarDni: vi.fn(),
  };
  const catalogo = {
    areas: () => of([{ id: 'a1', nombre: 'Ventas' }]),
    cargos: () => of([{ id: 'c1', areaId: 'a1', nombre: 'Ejecutivo', sueldoReferencial: 2200 }]),
  };
  await render(EmpleadoForm, {
    providers: [
      provideRouter([]),
      { provide: EmpleadosService, useValue: servicio },
      { provide: CatalogoService, useValue: catalogo },
    ],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { servicio, navegar, usuario: userEvent.setup() };
}

describe('Formulario de empleado', () => {
  it('cada campo tiene su etiqueta', async () => {
    await abrir();
    for (const etiqueta of [
      'DNI',
      'Nombres',
      'Apellidos',
      'Fecha de nacimiento',
      'Área',
      'Cargo',
    ]) {
      expect(screen.getByLabelText(new RegExp(etiqueta))).toBeInTheDocument();
    }
  });

  it('no guarda y marca los campos obligatorios si está vacío', async () => {
    const { servicio, usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Crear empleado' }));
    expect(servicio.crear).not.toHaveBeenCalled();
    expect((await screen.findAllByText('Este campo es obligatorio.')).length).toBeGreaterThan(3);
  });

  it('rechaza un DNI que no tiene 8 dígitos', async () => {
    const { servicio, usuario } = await abrir();
    await usuario.type(screen.getByRole('textbox', { name: /DNI/ }), '1234');
    await usuario.click(screen.getByRole('button', { name: 'Crear empleado' }));
    expect(await screen.findByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument();
    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('el botón de consultar DNI sigue deshabilitado mientras el DNI no sea válido', async () => {
    const { usuario } = await abrir();
    const boton = screen.getByRole('button', { name: /Completar nombres con el DNI/ });
    expect(boton).toBeDisabled();
    await usuario.type(screen.getByRole('textbox', { name: /DNI/ }), '47123890');
    expect(boton).toBeEnabled();
  });
});
