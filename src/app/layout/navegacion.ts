import { Rol } from '../core/auth/auth.models';

export interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  roles: readonly Rol[];
}

/** Menú de administración. Cada feature de la Fase 8 agrega aquí su entrada. */
export const NAVEGACION_ADMIN: readonly ItemNavegacion[] = [
  { etiqueta: 'Inicio', ruta: '/panel', roles: ['ADMIN_SAAS', 'ADMIN_EMPRESA', 'RRHH'] },
];

/** Barra inferior del portal del empleado. */
export const NAVEGACION_PORTAL: readonly ItemNavegacion[] = [
  { etiqueta: 'Inicio', ruta: '/portal', roles: ['EMPLEADO'] },
];

export function itemsPara(items: readonly ItemNavegacion[], rol: Rol | null): ItemNavegacion[] {
  return rol === null ? [] : items.filter((i) => i.roles.includes(rol));
}
