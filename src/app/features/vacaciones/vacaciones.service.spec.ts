import { probarPeticiones } from '../../shared/servicio.testing';
import { TIPO_PERMISO, VacacionesService } from './vacaciones.service';

probarPeticiones(VacacionesService, [
  {
    nombre: 'consulta mi saldo',
    llamar: (s) => s.miSaldo(),
    metodo: 'GET',
    ruta: '/vacaciones/saldo/mio',
  },
  {
    nombre: 'solicita vacaciones',
    llamar: (s) => s.solicitar('2026-12-01', '2026-12-10'),
    metodo: 'POST',
    ruta: '/vacaciones/solicitudes',
    cuerpo: { desde: '2026-12-01', hasta: '2026-12-10' },
  },
  {
    nombre: 'cancela una solicitud',
    llamar: (s) => s.cancelar('s1'),
    metodo: 'POST',
    ruta: '/vacaciones/solicitudes/s1/cancelar',
  },
  {
    nombre: 'crea un permiso',
    llamar: (s) =>
      s.crearPermiso({
        tipo: 'MEDICO',
        desde: '2026-11-01',
        hasta: '2026-11-01',
        conGoce: true,
        motivo: null,
      }),
    metodo: 'POST',
    ruta: '/permisos',
  },
  {
    nombre: 'lista solicitudes sin filtros',
    llamar: (s) => s.solicitudes(),
    metodo: 'GET',
    ruta: '/vacaciones/solicitudes',
    respuesta: [],
  },
  {
    nombre: 'lista solicitudes por estado y empleado',
    llamar: (s) => s.solicitudes('SOLICITADA', 'e1'),
    metodo: 'GET',
    ruta: '/vacaciones/solicitudes?estado=SOLICITADA&empleadoId=e1',
    respuesta: [],
  },
  {
    nombre: 'aprueba como jefe',
    llamar: (s) => s.aprobarJefe('s1'),
    metodo: 'POST',
    ruta: '/vacaciones/solicitudes/s1/aprobar-jefe',
  },
  {
    nombre: 'aprueba como RRHH',
    llamar: (s) => s.aprobarRrhh('s1'),
    metodo: 'POST',
    ruta: '/vacaciones/solicitudes/s1/aprobar-rrhh',
  },
  {
    nombre: 'rechaza con motivo',
    llamar: (s) => s.rechazar('s1', 'No hay cobertura'),
    metodo: 'POST',
    ruta: '/vacaciones/solicitudes/s1/rechazar',
    cuerpo: { motivo: 'No hay cobertura' },
  },
  {
    nombre: 'lista permisos sin filtro',
    llamar: (s) => s.permisos(),
    metodo: 'GET',
    ruta: '/permisos',
    respuesta: [],
  },
  {
    nombre: 'lista permisos por estado',
    llamar: (s) => s.permisos('APROBADO'),
    metodo: 'GET',
    ruta: '/permisos?estado=APROBADO',
    respuesta: [],
  },
  {
    nombre: 'aprueba un permiso',
    llamar: (s) => s.aprobarPermiso('p1'),
    metodo: 'POST',
    ruta: '/permisos/p1/aprobar',
  },
  {
    nombre: 'rechaza un permiso',
    llamar: (s) => s.rechazarPermiso('p1', 'Sin sustento'),
    metodo: 'POST',
    ruta: '/permisos/p1/rechazar',
    cuerpo: { motivo: 'Sin sustento' },
  },
  {
    nombre: 'consulta los saldos pendientes',
    llamar: (s) => s.saldos(),
    metodo: 'GET',
    ruta: '/reportes/vacaciones-pendientes',
    respuesta: [],
  },
]);

describe('TIPO_PERMISO', () => {
  it('traduce cada tipo a su texto', () => {
    expect(TIPO_PERMISO).toEqual({ MEDICO: 'Médico', PERSONAL: 'Personal', LICENCIA: 'Licencia' });
  });
});
