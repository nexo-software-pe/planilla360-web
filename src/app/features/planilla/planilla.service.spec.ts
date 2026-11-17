import { API_PRUEBA, montarServicio, probarPeticiones } from '../../shared/servicio.testing';
import { PlanillaService } from './planilla.service';

probarPeticiones(PlanillaService, [
  {
    nombre: 'lista omitiendo filtros vacíos',
    llamar: (s) => s.listar({ periodo: '2026-10', tipo: '', estado: 'CERRADA' }, 0, 20),
    metodo: 'GET',
    ruta: '/planillas?page=0&size=20&periodo=2026-10&estado=CERRADA',
  },
  {
    nombre: 'crea una mensual por defecto',
    llamar: (s) => s.crear('2026-10'),
    metodo: 'POST',
    ruta: '/planillas',
    cuerpo: { periodo: '2026-10', tipo: 'MENSUAL' },
  },
  {
    nombre: 'crea una gratificación',
    llamar: (s) => s.crear('2026-07', 'GRATIFICACION'),
    metodo: 'POST',
    ruta: '/planillas',
    cuerpo: { periodo: '2026-07', tipo: 'GRATIFICACION' },
  },
  {
    nombre: 'obtiene una planilla',
    llamar: (s) => s.obtener('p1'),
    metodo: 'GET',
    ruta: '/planillas/p1',
  },
  {
    nombre: 'calcula',
    llamar: (s) => s.calcular('p1'),
    metodo: 'POST',
    ruta: '/planillas/p1/calcular',
    cuerpo: {},
  },
  {
    nombre: 'lista las líneas',
    llamar: (s) => s.lineas('p1'),
    metodo: 'GET',
    ruta: '/planillas/p1/lineas',
    respuesta: [],
  },
  {
    nombre: 'consulta las validaciones',
    llamar: (s) => s.validaciones('p1'),
    metodo: 'GET',
    ruta: '/planillas/p1/validaciones',
  },
  {
    nombre: 'anula con motivo',
    llamar: (s) => s.anular('p1', 'Error de datos'),
    metodo: 'POST',
    ruta: '/planillas/p1/anular',
    cuerpo: { motivo: 'Error de datos' },
  },
  {
    nombre: 'registra el pago',
    llamar: (s) => s.registrarPago('p1', '2026-11-05', 'OP-1'),
    metodo: 'POST',
    ruta: '/planillas/p1/pago',
    cuerpo: { fechaPago: '2026-11-05', referencia: 'OP-1' },
  },
  {
    nombre: 'consulta el estado de las boletas',
    llamar: (s) => s.estadoBoletas('p1'),
    metodo: 'GET',
    ruta: '/planillas/p1/boletas/estado',
  },
  {
    nombre: 'genera las boletas',
    llamar: (s) => s.generarBoletas('p1'),
    metodo: 'POST',
    ruta: '/planillas/p1/boletas/generar',
  },
  {
    nombre: 'lista las boletas de una planilla',
    llamar: (s) => s.boletasDePlanilla('p1', 1, 10),
    metodo: 'GET',
    ruta: '/planillas/p1/boletas?page=1&size=10',
  },
  {
    nombre: 'simula una gratificación',
    llamar: (s) => s.beneficio('GRATIFICACION', '2026-07', true),
    metodo: 'POST',
    ruta: '/planillas/gratificacion',
    cuerpo: { periodo: '2026-07', simular: true },
  },
  {
    nombre: 'genera una CTS',
    llamar: (s) => s.beneficio('CTS', '2026-11', false),
    metodo: 'POST',
    ruta: '/planillas/cts',
    cuerpo: { periodo: '2026-11', simular: false },
  },
  {
    nombre: 'lista mis boletas',
    llamar: (s) => s.boletasMias(0, 12),
    metodo: 'GET',
    ruta: '/boletas/mias?page=0&size=12',
  },
  {
    nombre: 'descarga el PDF de una boleta',
    llamar: (s) => s.pdfBoleta('b1'),
    metodo: 'GET',
    ruta: '/boletas/b1/pdf',
    respuesta: new Blob(['x']),
  },
  {
    nombre: 'descarga la planilla mensual en Excel',
    llamar: (s) => s.planillaMensualXlsx('2026-10', 'MENSUAL'),
    metodo: 'GET',
    ruta: '/reportes/planilla-mensual.xlsx?periodo=2026-10&tipo=MENSUAL',
    respuesta: new Blob(['x']),
  },
  {
    nombre: 'consulta el costo laboral',
    llamar: (s) => s.costoLaboral('2026-10'),
    metodo: 'GET',
    ruta: '/reportes/costo-laboral?periodo=2026-10',
    respuesta: [],
  },
  {
    nombre: 'consulta tardanzas por área',
    llamar: (s) => s.tardanzasPorArea('2026-10', 3),
    metodo: 'GET',
    ruta: '/reportes/tardanzas-por-area?periodo=2026-10&top=3',
    respuesta: [],
  },
]);

describe('PlanillaService (cabeceras)', () => {
  it('el cierre envía la clave de idempotencia', () => {
    const { servicio, http } = montarServicio(PlanillaService);
    servicio.cerrar('p1', 'clave-123').subscribe();
    const req = http.expectOne(`${API_PRUEBA}/planillas/p1/cerrar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-123');
    req.flush({});
    http.verify();
  });
});
