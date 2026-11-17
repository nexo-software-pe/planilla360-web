import { Provider, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { Rol } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosService } from '../empleados/empleados.service';
import {
  Boleta,
  EstadoGeneracion,
  LineaPlanilla,
  Planilla,
  PlanillaService,
  Validacion,
} from './planilla.service';
import { PlanillaDetalle } from './planilla-detalle';

const ID_ANA = '11111111-1111-1111-1111-111111111111';

const planilla = (estado: Planilla['estado']): Planilla => ({
  id: 'p1',
  periodo: '2026-10',
  tipo: 'MENSUAL',
  estado,
  trabajadores: 1,
  totalIngresos: 3000,
  totalDescuentos: 400,
  totalNeto: 2600,
  totalEssalud: 270,
  cerradaEn: null,
});

const linea: LineaPlanilla = {
  empleadoId: 'e1',
  basico: 3000,
  totalIngresos: 3000,
  totalDescuentos: 400,
  neto: 2600,
  regimenPensionario: 'ONP',
  conceptos: [
    { codigo: 'BAS', descripcion: 'Sueldo básico', monto: 3000, tipo: 'INGRESO' },
    { codigo: 'ONP', descripcion: 'Aporte ONP', monto: 400, tipo: 'DESCUENTO' },
  ],
} as LineaPlanilla;

const sinValidaciones: Validacion = { valida: true, incidencias: [] };
const conValidaciones: Validacion = {
  valida: false,
  incidencias: [{ codigo: 'X', mensaje: `Falta el contrato de ${ID_ANA}.` }],
};
const listas: EstadoGeneracion = {
  planillaId: 'p1',
  estado: 'COMPLETADA',
  total: 2,
  pendientes: 0,
  generadas: 1,
  enviadas: 1,
  fallidas: 0,
};
const boleta = (id: string, estado: Boleta['estado']): Boleta => ({
  id,
  planillaId: 'p1',
  empleadoId: 'e1',
  periodo: '2026-10',
  tipo: 'MENSUAL',
  estado,
  generadaEn: null,
  enviadaEn: null,
});

interface Opciones {
  estado: Planilla['estado'];
  validacion?: Validacion;
  rol?: Rol;
  boletas?: EstadoGeneracion;
}

async function abrir({
  estado,
  validacion = sinValidaciones,
  rol = 'RRHH',
  boletas = listas,
}: Opciones) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 12));
  const servicio = {
    obtener: vi.fn(() => of(planilla(estado))),
    lineas: vi.fn(() => of([linea])),
    validaciones: vi.fn(() => of(validacion)),
    estadoBoletas: vi.fn(() => of(boletas)),
    calcular: vi.fn(() => of(planilla('CALCULADA'))),
    cerrar: vi.fn(() => of(planilla('CERRADA'))),
    anular: vi.fn(() => of(planilla('ANULADA'))),
    registrarPago: vi.fn(() => of({})),
    generarBoletas: vi.fn(() => of(boletas)),
    boletasDePlanilla: vi.fn(() =>
      of({
        contenido: [boleta('b1', 'GENERADA'), boleta('b2', 'FALLIDA')],
        pagina: 0,
        tamano: 100,
        totalElementos: 2,
        totalPaginas: 1,
      }),
    ),
    pdfBoleta: vi.fn(() => of(new Blob(['pdf']))),
  };
  const empleados = {
    directorio: () =>
      of([
        { id: 'e1', nombres: 'Ana', apellidos: 'Quispe' },
        { id: ID_ANA, nombres: 'Ana', apellidos: 'Quispe' },
      ]),
  };
  const t = proveedoresTransversales();
  await render(PlanillaDetalle, {
    inputs: { id: 'p1' },
    providers: [
      provideRouter([]),
      { provide: PlanillaService, useValue: servicio },
      { provide: EmpleadosService, useValue: empleados },
      { provide: AuthService, useValue: { rol: signal(rol) } },
      ...(t.providers as Provider[]),
    ],
  });
  return { servicio, ...t, persona: userEvent.setup({ advanceTimers: () => undefined }) };
}

describe('Detalle de planilla', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('en borrador invita a calcular y no muestra totales', async () => {
    const { servicio } = await abrir({ estado: 'BORRADOR' });
    expect(
      await screen.findByRole('heading', { name: 'Mensual de octubre de 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/La planilla está en borrador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calcular planilla' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cerrar planilla' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Totales de la planilla' })).toBeNull();
    expect(servicio.lineas).not.toHaveBeenCalled();
  });

  it('calculada y sin validaciones muestra totales y líneas, y deja cerrar', async () => {
    await abrir({ estado: 'CALCULADA' });
    expect(
      await screen.findByText('Sin validaciones pendientes: ya puedes cerrar la planilla.'),
    ).toBeInTheDocument();
    const totales = within(screen.getByRole('region', { name: 'Totales de la planilla' }));
    expect(totales.getByText(/2\s?600/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Quispe, Ana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recalcular' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cerrar planilla' })).toBeEnabled();
  });

  it('con validaciones pendientes las lista con el nombre del trabajador y bloquea el cierre', async () => {
    await abrir({ estado: 'CALCULADA', validacion: conValidaciones });
    expect(await screen.findByText('Falta el contrato de Quispe, Ana.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /1 validación pendiente antes de cerrar/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar planilla' })).toBeDisabled();
  });

  it('calcula y cierra la planilla tras confirmar', async () => {
    const { servicio, dialogos, persona } = await abrir({ estado: 'CALCULADA' });
    await persona.click(await screen.findByRole('button', { name: 'Recalcular' }));
    expect(servicio.calcular).toHaveBeenCalledWith('p1');

    await persona.click(screen.getByRole('button', { name: 'Cerrar planilla' }));
    expect(dialogos.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.stringContaining('octubre de 2026') }),
    );
    await waitFor(() => expect(servicio.cerrar).toHaveBeenCalledWith('p1', expect.any(String)));
  });

  it('muestra la boleta de un trabajador al pedir la vista previa y la oculta al repetir', async () => {
    const { persona } = await abrir({ estado: 'CALCULADA' });
    const boton = await screen.findByRole('button', {
      name: 'Vista previa de la boleta de Quispe, Ana',
    });
    await persona.click(boton);

    const boletaPanel = within(
      screen.getByRole('complementary', { name: 'Vista previa de la boleta' }),
    );
    expect(boletaPanel.getByText('Sueldo básico')).toBeInTheDocument();
    expect(boletaPanel.getByText('Aporte ONP')).toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-pressed', 'true');

    await persona.click(boton);
    expect(screen.queryByRole('complementary', { name: 'Vista previa de la boleta' })).toBeNull();
  });

  it('RRHH no ve el botón para anular una planilla cerrada', async () => {
    const rrhh = await abrir({ estado: 'CERRADA' });
    await screen.findByRole('button', { name: 'Registrar pago' });
    expect(screen.queryByRole('button', { name: 'Anular planilla' })).toBeNull();
    expect(rrhh.servicio.anular).not.toHaveBeenCalled();
  });

  it('el administrador de empresa anula una planilla cerrada con el motivo del diálogo', async () => {
    const { servicio, dialogos, persona } = await abrir({
      estado: 'CERRADA',
      rol: 'ADMIN_EMPRESA',
    });
    await persona.click(await screen.findByRole('button', { name: 'Anular planilla' }));
    expect(dialogos.pedirTexto).toHaveBeenCalled();
    await waitFor(() => expect(servicio.anular).toHaveBeenCalledWith('p1', 'x'));
  });

  it('planilla cerrada: registra el pago con fecha y referencia', async () => {
    const { servicio, persona } = await abrir({ estado: 'CERRADA' });
    await persona.click(await screen.findByRole('button', { name: 'Registrar pago' }));
    fireEvent.input(screen.getByLabelText(/Fecha de pago/), { target: { value: '2026-11-05' } });
    await persona.type(screen.getByLabelText(/Referencia/), ' OP-123 ');
    await persona.click(
      within(screen.getByRole('heading', { name: 'Registrar pago' }).closest('form')!).getByRole(
        'button',
        { name: 'Registrar pago' },
      ),
    );

    await waitFor(() =>
      expect(servicio.registrarPago).toHaveBeenCalledWith('p1', '2026-11-05', 'OP-123'),
    );
  });

  it('planilla cerrada: muestra el avance de las boletas y descarga una generada', async () => {
    const { servicio, persona } = await abrir({ estado: 'CERRADA' });
    expect(
      await screen.findByText(/2 de 2 generadas · 1 enviadas · 0 con error/),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Descargar la boleta de Quispe, Ana' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Descargar la boleta/ })).toHaveLength(1); // la fallida no

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await persona.click(screen.getByRole('button', { name: 'Descargar la boleta de Quispe, Ana' }));

    expect(servicio.pdfBoleta).toHaveBeenCalledWith('b1');
    expect(clic).toHaveBeenCalledTimes(1);
  });

  it('planilla cerrada sin boletas: invita a generarlas', async () => {
    const { servicio, persona } = await abrir({
      estado: 'CERRADA',
      boletas: { ...listas, total: 0, generadas: 0, enviadas: 0 },
    });
    expect(await screen.findByText(/Aún no se generaron las boletas/)).toBeInTheDocument();
    await persona.click(screen.getByRole('button', { name: 'Generar boletas' }));
    await waitFor(() => expect(servicio.generarBoletas).toHaveBeenCalledWith('p1'));
  });
});
