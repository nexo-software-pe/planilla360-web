import { Rol } from '../core/auth/auth.models';

export interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  roles: readonly Rol[];
}

/** Menú de administración. Cada feature de la Fase 8 agrega aquí su entrada. */
export const NAVEGACION_ADMIN: readonly ItemNavegacion[] = [
  { etiqueta: 'Inicio', ruta: '/panel', roles: ['ADMIN_SAAS', 'ADMIN_EMPRESA', 'RRHH'] },
  { etiqueta: 'Empleados', ruta: '/panel/empleados', roles: ['ADMIN_EMPRESA', 'RRHH'] },
  { etiqueta: 'Asistencia', ruta: '/panel/asistencia', roles: ['ADMIN_EMPRESA', 'RRHH'] },
  {
    etiqueta: 'Vacaciones y permisos',
    ruta: '/panel/vacaciones',
    roles: ['ADMIN_EMPRESA', 'RRHH'],
  },
  { etiqueta: 'Usuarios', ruta: '/panel/usuarios', roles: ['ADMIN_EMPRESA'] },
  { etiqueta: 'Áreas y cargos', ruta: '/panel/areas-cargos', roles: ['ADMIN_EMPRESA'] },
  { etiqueta: 'Auditoría', ruta: '/panel/auditoria', roles: ['ADMIN_EMPRESA'] },
  { etiqueta: 'Empresas', ruta: '/panel/empresas', roles: ['ADMIN_SAAS'] },
  { etiqueta: 'Parámetros legales', ruta: '/panel/parametros-legales', roles: ['ADMIN_SAAS'] },
];

/** Barra inferior del portal del empleado. */
export const NAVEGACION_PORTAL: readonly ItemNavegacion[] = [
  { etiqueta: 'Inicio', ruta: '/portal', roles: ['EMPLEADO'] },
];

export function itemsPara(items: readonly ItemNavegacion[], rol: Rol | null): ItemNavegacion[] {
  return rol === null ? [] : items.filter((i) => i.roles.includes(rol));
}
