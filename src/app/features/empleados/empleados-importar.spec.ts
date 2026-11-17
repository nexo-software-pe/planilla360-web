import { Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosImportar } from './empleados-importar';
import { EmpleadosService, ResultadoImportacion } from './empleados.service';

const simulacion: ResultadoImportacion = {
  totalFilas: 5,
  validas: 3,
  importadas: 0,
  simulacion: true,
  errores: [
    { fila: 2, campo: 'dni', mensaje: 'DNI inválido' },
    { fila: 4, campo: null, mensaje: 'Fila incompleta' },
  ],
};

async function abrir(respuesta: ResultadoImportacion = simulacion) {
  const servicio = {
    importar: vi.fn((_f: File, simular: boolean) =>
      of(simular ? respuesta : { ...respuesta, simulacion: false, importadas: respuesta.validas }),
    ),
    plantillaImportacion: vi.fn(() => of(new Blob(['x']))),
  };
  const t = proveedoresTransversales();
  await render(EmpleadosImportar, {
    providers: [
      provideRouter([]),
      { provide: EmpleadosService, useValue: servicio },
      ...(t.providers as Provider[]),
    ],
  });
  return { servicio, ...t, persona: userEvent.setup({ applyAccept: false }) };
}

const excel = (nombre = 'empleados.xlsx', bytes = 10) => new File([new Uint8Array(bytes)], nombre);

describe('Importar empleados', () => {
  it('descarga la plantilla con el nombre esperado', async () => {
    const { servicio, persona } = await abrir();
    const crear = vi.fn(() => 'blob:plantilla');
    const revocar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }));
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await persona.click(screen.getByRole('button', { name: 'Descargar plantilla' }));

    expect(servicio.plantillaImportacion).toHaveBeenCalled();
    expect(clic).toHaveBeenCalledTimes(1);
    expect(revocar).toHaveBeenCalledWith('blob:plantilla');
    clic.mockRestore();
    vi.unstubAllGlobals();
  });

  it('no se puede validar sin elegir un archivo', async () => {
    await abrir();
    expect(screen.getByRole('button', { name: 'Validar archivo' })).toBeDisabled();
  });

  it('rechaza un archivo que no es .xlsx', async () => {
    const { persona } = await abrir();
    await persona.upload(screen.getByLabelText('Archivo de Excel'), excel('empleados.csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo debe ser un Excel (.xlsx).',
    );
    expect(screen.getByRole('button', { name: 'Validar archivo' })).toBeDisabled();
  });

  it('rechaza un archivo de más de 5 MB', async () => {
    const { persona } = await abrir();
    await persona.upload(
      screen.getByLabelText('Archivo de Excel'),
      excel('grande.xlsx', 5 * 1024 * 1024 + 1),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo supera los 5 MB permitidos.',
    );
  });

  it('valida el archivo, muestra los errores por fila y permite importar las válidas', async () => {
    const { servicio, avisos, persona } = await abrir();
    await persona.upload(screen.getByLabelText('Archivo de Excel'), excel());
    await persona.click(screen.getByRole('button', { name: 'Validar archivo' }));

    expect(servicio.importar).toHaveBeenCalledWith(expect.any(File), true);
    expect(
      await screen.findByRole('heading', { name: '3. Resultado de la validación' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'DNI inválido' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument(); // error sin campo
    expect(screen.getByText(/Las filas con errores no se importarán/)).toBeInTheDocument();

    await persona.click(screen.getByRole('button', { name: 'Importar 3 filas válidas' }));
    expect(servicio.importar).toHaveBeenLastCalledWith(expect.any(File), false);
    expect(
      await screen.findByRole('heading', { name: 'Importación terminada' }),
    ).toBeInTheDocument();
    expect(avisos.exito).toHaveBeenCalledWith('Se importaron 3 empleados.');
    expect(screen.getByRole('link', { name: 'Ver empleados' })).toHaveAttribute(
      'href',
      '/panel/empleados',
    );
  });

  it('no deja importar cuando ninguna fila es válida', async () => {
    const { persona } = await abrir({ ...simulacion, validas: 0 });
    await persona.upload(screen.getByLabelText('Archivo de Excel'), excel());
    await persona.click(screen.getByRole('button', { name: 'Validar archivo' }));

    expect(await screen.findByRole('button', { name: 'Importar 0 filas válidas' })).toBeDisabled();
  });
});
