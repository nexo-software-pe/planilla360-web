import { probarPeticiones } from '../../shared/servicio.testing';
import { AsistenciaService, DIAS_SEMANA } from './asistencia.service';

const horario = {
  nombre: 'Oficina',
  entrada: '08:00',
  salida: '17:00',
  toleranciaMin: 10,
  refrigerioMin: 60,
  dias: ['MONDAY' as const],
};

probarPeticiones(AsistenciaService, [
  {
    nombre: 'marca entrada o salida',
    llamar: (s) => s.marcar(),
    metodo: 'POST',
    ruta: '/asistencia/marcaciones',
  },
  {
    nombre: 'consulta mi asistencia del mes',
    llamar: (s) => s.miAsistencia('2026-11'),
    metodo: 'GET',
    ruta: '/asistencia/mia?mes=2026-11',
    respuesta: [],
  },
  {
    nombre: 'consulta el resumen del mes',
    llamar: (s) => s.resumen('2026-11'),
    metodo: 'GET',
    ruta: '/asistencia/resumen?mes=2026-11',
    respuesta: [],
  },
  {
    nombre: 'consulta el detalle de un empleado',
    llamar: (s) => s.detalle('e1', '2026-11'),
    metodo: 'GET',
    ruta: '/asistencia?empleadoId=e1&mes=2026-11',
    respuesta: [],
  },
  {
    nombre: 'lista horas extra sin filtro',
    llamar: (s) => s.horasExtra(),
    metodo: 'GET',
    ruta: '/asistencia/horas-extra',
    respuesta: [],
  },
  {
    nombre: 'lista horas extra pendientes',
    llamar: (s) => s.horasExtra('PENDIENTE'),
    metodo: 'GET',
    ruta: '/asistencia/horas-extra?estado=PENDIENTE',
    respuesta: [],
  },
  {
    nombre: 'resuelve una hora extra',
    llamar: (s) => s.resolverHoraExtra('h1', 'APROBAR'),
    metodo: 'PATCH',
    ruta: '/asistencia/horas-extra/h1',
    cuerpo: { accion: 'APROBAR' },
  },
  {
    nombre: 'lista horarios',
    llamar: (s) => s.horarios(),
    metodo: 'GET',
    ruta: '/horarios',
    respuesta: [],
  },
  {
    nombre: 'crea un horario',
    llamar: (s) => s.crearHorario(horario),
    metodo: 'POST',
    ruta: '/horarios',
    cuerpo: horario,
  },
  {
    nombre: 'asigna un horario',
    llamar: (s) => s.asignarHorario('h1', 'e1', '2026-11-01'),
    metodo: 'POST',
    ruta: '/horarios/h1/asignaciones',
    cuerpo: { empleadoId: 'e1', desde: '2026-11-01' },
  },
]);

describe('DIAS_SEMANA', () => {
  it('cubre los siete días empezando por el lunes', () => {
    expect(DIAS_SEMANA).toHaveLength(7);
    expect(DIAS_SEMANA[0].largo).toBe('Lunes');
    expect(DIAS_SEMANA[6].valor).toBe('SUNDAY');
  });
});
