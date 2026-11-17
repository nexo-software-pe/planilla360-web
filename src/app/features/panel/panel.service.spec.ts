import { HttpTestingController } from '@angular/common/http/testing';
import { API_PRUEBA, montarServicio } from '../../shared/servicio.testing';
import { IndicadoresRrhh, PanelService } from './panel.service';

const pagina = (contenido: unknown[], total = contenido.length) => ({
  contenido,
  pagina: 0,
  tamano: 1,
  totalElementos: total,
  totalPaginas: 1,
});

const planilla = (id: string, estado: string) => ({
  id,
  estado,
  periodo: '2026-11',
  tipo: 'MENSUAL',
});

const persona = (id: string, nombres: string, nacimiento: string, estado = 'ACTIVO') => ({
  id,
  nombres,
  apellidos: 'Prueba',
  fechaNacimiento: nacimiento,
  estado,
});

function responder(
  http: HttpTestingController,
  opciones: { resumenFalla?: boolean; planillas?: unknown[] },
) {
  for (const req of http.match(() => true)) {
    const url = req.request.urlWithParams.replace(API_PRUEBA, '');
    if (url.startsWith('/empleados?') && url.includes('estado=')) {
      const total = url.includes('ACTIVO') ? 12 : url.includes('VACACIONES') ? 2 : 1;
      req.flush(pagina([], total));
    } else if (url.startsWith('/empleados?')) {
      req.flush({
        ...pagina([]),
        contenido: [
          persona('e1', 'Ana', '1990-11-20'),
          persona('e2', 'Beto', '1985-11-03'),
          persona('e3', 'Cesa', '1980-11-10', 'CESADO'),
          persona('e4', 'Otro', '1980-02-10'),
        ],
      });
    } else if (url.startsWith('/planillas')) {
      req.flush(pagina(opciones.planillas ?? []));
    } else if (url.startsWith('/vacaciones/solicitudes')) {
      req.flush(url.includes('estado=SOLICITADA') ? [{ id: 's1' }, { id: 's2' }] : [{ id: 's3' }]);
    } else if (url.startsWith('/permisos')) {
      req.flush([{ id: 'p1' }]);
    } else if (url.startsWith('/asistencia/horas-extra')) {
      req.flush([{ id: 'h1' }, { id: 'h2' }]);
    } else if (url.startsWith('/asistencia/resumen')) {
      if (opciones.resumenFalla) req.flush({}, { status: 404, statusText: 'No existe' });
      else req.flush([{ tardanzas: 2 }, { tardanzas: 3 }]);
    } else if (url.startsWith('/reportes/vacaciones-pendientes')) {
      req.flush([
        { empleadoId: 'e1', vencido: true },
        { empleadoId: 'e2', vencido: false },
      ]);
    } else {
      throw new Error(`petición inesperada: ${url}`);
    }
  }
}

describe('PanelService', () => {
  it('elige la planilla que no está anulada', () => {
    const { servicio, http } = montarServicio(PanelService);
    let elegida: unknown;
    servicio.planillaDelMes('2026-11').subscribe((p) => (elegida = p));
    http
      .expectOne((r) => r.url === `${API_PRUEBA}/planillas`)
      .flush(pagina([planilla('vieja', 'ANULADA'), planilla('nueva', 'CALCULADA')]));
    expect(elegida).toMatchObject({ id: 'nueva' });
  });

  it('si solo hay anuladas devuelve la primera; si no hay ninguna, null', () => {
    const { servicio, http } = montarServicio(PanelService);
    const vistas: unknown[] = [];
    servicio.planillaDelMes('2026-11').subscribe((p) => vistas.push(p));
    http
      .expectOne((r) => r.url === `${API_PRUEBA}/planillas`)
      .flush(pagina([planilla('a1', 'ANULADA')]));
    servicio.planillaDelMes('2026-11').subscribe((p) => vistas.push(p));
    http.expectOne((r) => r.url === `${API_PRUEBA}/planillas`).flush(pagina([]));
    expect(vistas).toEqual([expect.objectContaining({ id: 'a1' }), null]);
  });

  it('arma los indicadores del panel a partir de los endpoints', () => {
    const { servicio, http } = montarServicio(PanelService);
    let r!: IndicadoresRrhh;
    servicio.indicadoresRrhh('2026-11').subscribe((v) => (r = v));
    responder(http, { planillas: [planilla('p1', 'CALCULADA')] });

    expect(r.activos).toBe(12);
    expect(r.enVacaciones).toBe(2);
    expect(r.conLicencia).toBe(1);
    expect(r.vacacionesPorAprobar).toBe(3);
    expect(r.permisosPorAprobar).toBe(1);
    expect(r.horasExtraPendientes).toBe(2);
    expect(r.tardanzasDelMes).toBe(5);
    expect(r.periodosVencidos).toHaveLength(1);
    expect(r.planilla?.id).toBe('p1');
    // solo cumpleaños del mes, sin cesados, ordenados por día
    expect(r.cumpleanos).toEqual([
      { nombre: 'Beto Prueba', dia: 3, edad: 41 },
      { nombre: 'Ana Prueba', dia: 20, edad: 36 },
    ]);
  });

  it('un mes sin resumen no tumba el panel: cuenta cero tardanzas', () => {
    const { servicio, http } = montarServicio(PanelService);
    let r!: IndicadoresRrhh;
    servicio.indicadoresRrhh('2026-11').subscribe((v) => (r = v));
    responder(http, { resumenFalla: true });
    expect(r.tardanzasDelMes).toBe(0);
    expect(r.planilla).toBeNull();
  });
});
