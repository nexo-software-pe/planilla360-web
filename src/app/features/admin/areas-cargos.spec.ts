import { Provider } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { CatalogoService } from '../catalogo/catalogo.service';
import { AreasCargos } from './areas-cargos';

async function abrir(vacio = false) {
  const catalogo = {
    olvidar: vi.fn(),
    areas: vi.fn(() => of(vacio ? [] : [{ id: 'a1', nombre: 'Ventas' }])),
    cargos: vi.fn(() =>
      of(vacio ? [] : [{ id: 'c1', areaId: 'a1', nombre: 'Analista', sueldoReferencial: 3500 }]),
    ),
    crearArea: vi.fn(() => of({ id: 'a2', nombre: 'Compras' })),
    actualizarArea: vi.fn(() => of({ id: 'a1', nombre: 'Comercial' })),
    eliminarArea: vi.fn(() => of(undefined)),
    crearCargo: vi.fn(() => of({})),
    actualizarCargo: vi.fn(() => of({})),
    eliminarCargo: vi.fn(() => of(undefined)),
  };
  const t = proveedoresTransversales();
  await render(AreasCargos, {
    providers: [{ provide: CatalogoService, useValue: catalogo }, ...(t.providers as Provider[])],
  });
  return { catalogo, ...t, usuario: userEvent.setup() };
}

describe('Áreas y cargos', () => {
  it('muestra las áreas con su cantidad de cargos y los cargos con su área y sueldo', async () => {
    await abrir();
    expect(await screen.findAllByText('Ventas')).toHaveLength(2); // en su tabla y como área del cargo
    expect(screen.getByText('Analista')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /3\s?500/ })).toBeInTheDocument();
  });

  it('indica cuando aún no hay áreas ni cargos y no ofrece crear cargos', async () => {
    await abrir(true);
    expect(await screen.findByText('Aún no hay áreas.')).toBeInTheDocument();
    expect(screen.getByText('Aún no hay cargos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo cargo' })).toBeNull();
  });

  it('crea un área y recarga la lista', async () => {
    const { catalogo, avisos, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva área' }));
    await usuario.type(screen.getByRole('textbox', { name: /Nombre del área/ }), '  Compras ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(catalogo.crearArea).toHaveBeenCalledWith('Compras');
    expect(avisos.exito).toHaveBeenCalledWith('Área creada.');
    expect(catalogo.areas).toHaveBeenCalledTimes(2);
  });

  it('no guarda un área sin nombre y muestra el error', async () => {
    const { catalogo, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva área' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(catalogo.crearArea).not.toHaveBeenCalled();
    expect(await screen.findByText('Este campo es obligatorio.')).toBeInTheDocument();
  });

  it('edita un área existente', async () => {
    const { catalogo, avisos, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Editar el área Ventas' }));
    const campo = screen.getByRole('textbox', { name: /Nombre del área/ });
    expect(campo).toHaveValue('Ventas');
    await usuario.clear(campo);
    await usuario.type(campo, 'Comercial');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(catalogo.actualizarArea).toHaveBeenCalledWith('a1', 'Comercial');
    expect(avisos.exito).toHaveBeenCalledWith('Área actualizada.');
  });

  it('elimina un área tras confirmar', async () => {
    const { catalogo, dialogos, avisos, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar el área Ventas' }));

    expect(dialogos.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Eliminar área' }),
    );
    expect(catalogo.eliminarArea).toHaveBeenCalledWith('a1');
    expect(avisos.exito).toHaveBeenCalledWith('Área eliminada.');
  });

  it('crea un cargo eligiendo el área', async () => {
    const { catalogo, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo cargo' }));
    await usuario.type(screen.getByRole('textbox', { name: /Nombre del cargo/ }), 'Jefe');
    await usuario.click(screen.getByRole('combobox', { name: /Área/ }));
    await usuario.click(await screen.findByRole('option', { name: 'Ventas' }));
    await usuario.type(screen.getByRole('spinbutton', { name: /Sueldo referencial/ }), '4200');
    await usuario.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    expect(catalogo.crearCargo).toHaveBeenCalledWith({
      nombre: 'Jefe',
      areaId: 'a1',
      sueldoReferencial: 4200,
    });
  });

  it('edita y elimina un cargo', async () => {
    const { catalogo, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Editar el cargo Analista' }));
    expect(screen.getByRole('textbox', { name: /Nombre del cargo/ })).toHaveValue('Analista');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(catalogo.actualizarCargo).toHaveBeenCalledWith('c1', {
      nombre: 'Analista',
      areaId: 'a1',
      sueldoReferencial: 3500,
    });

    await usuario.click(await screen.findByRole('button', { name: 'Eliminar el cargo Analista' }));
    expect(catalogo.eliminarCargo).toHaveBeenCalledWith('c1');
  });
});
