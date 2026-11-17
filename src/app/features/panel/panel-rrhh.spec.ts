import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { IndicadoresRrhh, PanelService, PlanillaResumen } from './panel.service';
import { PanelRrhh } from './panel-rrhh';

const planilla = (estado: PlanillaResumen['estado']): PlanillaResumen => ({
  id: 'p1',
  periodo: '2026-11',
  tipo: 'MENSUAL',
  estado,
  trabajadores: 12,
  totalIngresos: 40000,
  totalDescuentos: 5000,
  totalNeto: 35000,
  totalEssalud: 3600,
  cerradaEn: null,
});

const base: IndicadoresRrhh = {
  activos: 12,
  enVacaciones: 2,
  conLicencia: 1,
  planilla: planilla('CERRADA'),
  vacacionesPorAprobar: 0,
  permisosPorAprobar: 0,
  horasExtraPendientes: 0,
  tardanzasDelMes: 4,
  periodosVencidos: [],
  cumpleanos: [],
};

async function abrir(
  datos: Partial<IndicadoresRrhh> = {},
  indicadoresRrhh = vi.fn(() => of({ ...base, ...datos })),
) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 12));
  const panel = { indicadoresRrhh };
  await render(PanelRrhh, {
    providers: [
      provideRouter([]),
      { provide: PanelService, useValue: panel },
      { provide: AuthService, useValue: { usuario: signal({ nombre: 'Rosa RRHH' }) } },
    ],
  });
  return panel;
}

describe('Panel de RRHH', () => {
  afterEach(() => vi.useRealTimers());

  it('muestra los indicadores del personal y el saludo con el mes', async () => {
    await abrir();
    expect(await screen.findByText('Resumen de noviembre de 2026 · Rosa RRHH')).toBeInTheDocument();
    const activos = within(
      screen.getByRole('heading', { name: 'Personal activo' }).closest('article')!,
    );
    expect(activos.getByText('12')).toBeInTheDocument();
    expect(activos.getByText('2 de vacaciones · 1 con licencia')).toBeInTheDocument();
    const tardanzas = within(
      screen.getByRole('heading', { name: 'Tardanzas del mes' }).closest('article')!,
    );
    expect(tardanzas.getByText('4')).toBeInTheDocument();
  });

  it('suma las solicitudes por aprobar y enlaza a la bandeja', async () => {
    await abrir({ vacacionesPorAprobar: 2, permisosPorAprobar: 1, horasExtraPendientes: 3 });
    const tarjeta = within(
      (await screen.findByRole('heading', { name: 'Solicitudes por aprobar' })).closest('article')!,
    );
    expect(tarjeta.getByText('6')).toBeInTheDocument();
    expect(tarjeta.getByRole('link', { name: '2 vacaciones · 1 permisos' })).toHaveAttribute(
      'href',
      '/panel/vacaciones/bandeja',
    );
    expect(tarjeta.getByRole('link', { name: '3 horas extra' })).toBeInTheDocument();
  });

  it('con la planilla cerrada muestra sus totales y no hay alertas', async () => {
    await abrir();
    const seccion = within(
      await screen.findByRole('region', { name: 'Planilla de noviembre de 2026' }),
    );
    expect(seccion.getByText('Cerrada')).toBeInTheDocument();
    expect(seccion.getByText(/35\s?000/)).toBeInTheDocument();
    expect(screen.getByText('Todo en orden: no hay alertas por atender.')).toBeInTheDocument();
    expect(screen.getByText('Nadie cumple años este mes.')).toBeInTheDocument();
  });

  it('alerta cuando la planilla está en borrador, con singular y plural correctos', async () => {
    await abrir({
      planilla: planilla('BORRADOR'),
      periodosVencidos: [
        {
          empleadoId: 'e1',
          trabajador: 'Ana',
          periodoDesde: '',
          periodoHasta: '',
          saldoDias: 30,
          saldoTotalDias: 30,
          vencido: true,
        },
      ],
      horasExtraPendientes: 2,
      vacacionesPorAprobar: 1,
    });
    expect(await screen.findByText(/La planilla aún no se calcula/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'La planilla de noviembre de 2026 está en estado borrador: aún no se cierra.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 periodo de vacaciones vencido sin gozar\./)).toBeInTheDocument();
    expect(
      screen.getByText(/2 solicitudes de horas extra esperan aprobación\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 solicitud de vacaciones o permisos por resolver\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver saldos' })).toHaveAttribute(
      'href',
      '/panel/vacaciones/saldos',
    );
  });

  it('avisa cuando falta crear la planilla del mes', async () => {
    await abrir({ planilla: null });
    expect(
      await screen.findByText('Todavía no se creó la planilla de noviembre de 2026.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Falta crear la planilla de noviembre de 2026.')).toBeInTheDocument();
  });

  it('lista los cumpleaños del mes', async () => {
    await abrir({ cumpleanos: [{ nombre: 'Ana Quispe', dia: 20, edad: 36 }] });
    expect(await screen.findByText('Ana Quispe')).toBeInTheDocument();
    expect(screen.getByText('36 años')).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar', async () => {
    const panel = await abrir(
      {},
      vi
        .fn()
        .mockReturnValueOnce(throwError(() => new ApiError(500, 'Error', 'Falló el servidor')))
        .mockReturnValue(of(base)),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Falló el servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Personal activo')).toBeInTheDocument();
    expect(panel.indicadoresRrhh).toHaveBeenCalledTimes(2);
  });
});
