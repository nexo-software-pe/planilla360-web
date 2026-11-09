export type Rol = 'ADMIN_SAAS' | 'ADMIN_EMPRESA' | 'RRHH' | 'EMPLEADO';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  tenantId?: string | null;
  empleadoId?: string | null;
  activo?: boolean;
}

export interface EmpresaResumen {
  id: string;
  razonSocial: string;
  ruc: string;
  regimenLaboral?: 'GENERAL' | 'PEQUENA_EMPRESA';
  activa?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiraEnSegundos: number;
  tokenType: string;
  usuario: Usuario;
}

export interface Perfil {
  usuario: Usuario;
  empresa?: EmpresaResumen | null;
}

export const ROLES_ADMINISTRACION: readonly Rol[] = ['ADMIN_SAAS', 'ADMIN_EMPRESA', 'RRHH'];

/** Pantalla de entrada según el rol: administración (`/panel`) o portal del empleado. */
export function rutaInicialPara(rol: Rol | null): string {
  if (rol === null) return '/login';
  return rol === 'EMPLEADO' ? '/portal' : '/panel';
}
