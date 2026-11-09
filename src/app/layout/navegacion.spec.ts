import { NAVEGACION_ADMIN, itemsPara } from './navegacion';

const etiquetas = (rol: Parameters<typeof itemsPara>[1]) =>
  itemsPara(NAVEGACION_ADMIN, rol).map((i) => i.etiqueta);

describe('menú de administración por rol', () => {
  it('RRHH ve solo la gestión del personal', () => {
    expect(etiquetas('RRHH')).toEqual([
      'Inicio',
      'Empleados',
      'Asistencia',
      'Vacaciones y permisos',
    ]);
  });

  it('el administrador de empresa suma usuarios, áreas y auditoría', () => {
    const items = etiquetas('ADMIN_EMPRESA');
    expect(items).toEqual(
      expect.arrayContaining(['Empleados', 'Usuarios', 'Áreas y cargos', 'Auditoría']),
    );
    expect(items).not.toContain('Empresas');
  });

  it('el administrador de la plataforma solo ve empresas y parámetros legales', () => {
    expect(etiquetas('ADMIN_SAAS')).toEqual(['Inicio', 'Empresas', 'Parámetros legales']);
  });

  it('el empleado no ve nada del menú de administración y sin sesión no hay menú', () => {
    expect(etiquetas('EMPLEADO')).toEqual([]);
    expect(etiquetas(null)).toEqual([]);
  });
});
