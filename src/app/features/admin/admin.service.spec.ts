import { probarPeticiones } from '../../shared/servicio.testing';
import { AdminService, ROL_TEXTO } from './admin.service';

probarPeticiones(AdminService, [
  {
    nombre: 'lista usuarios paginados y ordenados por nombre',
    llamar: (s) => s.usuarios(1, 20),
    metodo: 'GET',
    ruta: '/usuarios?page=1&size=20&sort=nombre,asc',
  },
  {
    nombre: 'crea un usuario',
    llamar: (s) =>
      s.crearUsuario({
        email: 'a@b.pe',
        nombre: 'Ana',
        password: 'x',
        rol: 'RRHH',
        empleadoId: null,
      }),
    metodo: 'POST',
    ruta: '/usuarios',
    cuerpo: { email: 'a@b.pe', nombre: 'Ana', password: 'x', rol: 'RRHH', empleadoId: null },
  },
  {
    nombre: 'actualiza un usuario',
    llamar: (s) => s.actualizarUsuario('u1', { nombre: 'Ana', rol: 'EMPLEADO', empleadoId: 'e1' }),
    metodo: 'PUT',
    ruta: '/usuarios/u1',
    cuerpo: { nombre: 'Ana', rol: 'EMPLEADO', empleadoId: 'e1' },
  },
  {
    nombre: 'cambia el estado de un usuario',
    llamar: (s) => s.cambiarEstadoUsuario('u1', false),
    metodo: 'PATCH',
    ruta: '/usuarios/u1/estado',
    cuerpo: { activo: false },
  },
  {
    nombre: 'restablece la contraseña',
    llamar: (s) => s.restablecerPassword('u1', 'Nueva-123'),
    metodo: 'POST',
    ruta: '/usuarios/u1/reset-password',
    cuerpo: { passwordNueva: 'Nueva-123' },
  },
  {
    nombre: 'consulta la auditoría sin enviar filtros vacíos',
    llamar: (s) => s.auditoria({ entidad: 'Empleado', desde: '' }, 0, 10),
    metodo: 'GET',
    ruta: '/auditoria?page=0&size=10&entidad=Empleado',
  },
  {
    nombre: 'lista empresas activas',
    llamar: (s) => s.empresas(0, 10, true),
    metodo: 'GET',
    ruta: '/empresas?page=0&size=10&activa=true',
  },
  {
    nombre: 'lista empresas sin filtrar por estado',
    llamar: (s) => s.empresas(0, 10),
    metodo: 'GET',
    ruta: '/empresas?page=0&size=10',
  },
  {
    nombre: 'crea una empresa',
    llamar: (s) =>
      s.crearEmpresa({
        ruc: '20123456789',
        razonSocial: 'Textiles S.A.C.',
        regimenLaboral: 'GENERAL',
        plan: 'BASICO',
      }),
    metodo: 'POST',
    ruta: '/empresas',
  },
  {
    nombre: 'actualiza una empresa',
    llamar: (s) =>
      s.actualizarEmpresa('e1', {
        ruc: '20123456789',
        razonSocial: 'Textiles S.A.C.',
        regimenLaboral: 'PEQUENA_EMPRESA',
        plan: 'PROFESIONAL',
      }),
    metodo: 'PUT',
    ruta: '/empresas/e1',
  },
  {
    nombre: 'cambia el estado de una empresa',
    llamar: (s) => s.cambiarEstadoEmpresa('e1', true),
    metodo: 'PATCH',
    ruta: '/empresas/e1/estado',
    cuerpo: { activa: true },
  },
  {
    nombre: 'lista los parámetros legales',
    llamar: (s) => s.parametrosLegales(),
    metodo: 'GET',
    ruta: '/parametros-legales',
    respuesta: [],
  },
  {
    nombre: 'crea un parámetro legal',
    llamar: (s) =>
      s.crearParametroLegal({
        codigo: 'RMV',
        descripcion: 'Remuneración mínima',
        valor: 1130,
        vigenteDesde: '2026-01-01',
      }),
    metodo: 'POST',
    ruta: '/parametros-legales',
  },
]);

describe('ROL_TEXTO', () => {
  it('tiene un texto para cada rol', () => {
    expect(Object.keys(ROL_TEXTO).sort()).toEqual([
      'ADMIN_EMPRESA',
      'ADMIN_SAAS',
      'EMPLEADO',
      'RRHH',
    ]);
  });
});
