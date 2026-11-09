import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Rol } from '../../core/auth/auth.models';
import { API_URL } from '../../core/config/api-url';
import { Pagina } from '../../shared/pagina';

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  tenantId: string | null;
  empleadoId: string | null;
  activo: boolean;
  creadoEn: string;
  ultimoAcceso: string | null;
}

export interface UsuarioRequest {
  email: string;
  nombre: string;
  password: string;
  rol: Rol;
  empleadoId: string | null;
}

export interface ActualizarUsuarioRequest {
  nombre: string;
  rol: Rol;
  empleadoId: string | null;
}

export interface RegistroAuditoria {
  id: string;
  entidad: string;
  entidadId: string;
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR';
  usuario: string | null;
  instante: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
}

export interface FiltrosAuditoria {
  entidad?: string;
  desde?: string;
  hasta?: string;
}

export type PlanEmpresa = 'BASICO' | 'PROFESIONAL' | 'EMPRESARIAL';
export type RegimenEmpresa = 'GENERAL' | 'PEQUENA_EMPRESA';

export interface Empresa {
  id: string;
  ruc: string;
  razonSocial: string;
  regimenLaboral: RegimenEmpresa;
  plan: PlanEmpresa;
  activa: boolean;
  creadaEn: string;
}

export type EmpresaRequest = Pick<Empresa, 'ruc' | 'razonSocial' | 'regimenLaboral' | 'plan'>;

export interface ParametroLegal {
  id: string;
  codigo: string;
  descripcion: string;
  valor: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export type ParametroLegalRequest = Pick<
  ParametroLegal,
  'codigo' | 'descripcion' | 'valor' | 'vigenteDesde'
>;

/** Operaciones de administración: usuarios, auditoría, empresas y parámetros legales. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  usuarios(pagina: number, tamano: number): Observable<Pagina<UsuarioAdmin>> {
    return this.http.get<Pagina<UsuarioAdmin>>(`${this.api}/usuarios`, {
      params: new HttpParams().set('page', pagina).set('size', tamano).set('sort', 'nombre,asc'),
    });
  }

  crearUsuario(datos: UsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${this.api}/usuarios`, datos);
  }

  actualizarUsuario(id: string, datos: ActualizarUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.api}/usuarios/${id}`, datos);
  }

  cambiarEstadoUsuario(id: string, activo: boolean): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.api}/usuarios/${id}/estado`, { activo });
  }

  restablecerPassword(id: string, passwordNueva: string): Observable<void> {
    return this.http.post<void>(`${this.api}/usuarios/${id}/reset-password`, { passwordNueva });
  }

  auditoria(
    filtros: FiltrosAuditoria,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<RegistroAuditoria>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Pagina<RegistroAuditoria>>(`${this.api}/auditoria`, { params });
  }

  empresas(pagina: number, tamano: number, activa?: boolean): Observable<Pagina<Empresa>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    if (activa !== undefined) params = params.set('activa', activa);
    return this.http.get<Pagina<Empresa>>(`${this.api}/empresas`, { params });
  }

  crearEmpresa(datos: EmpresaRequest): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.api}/empresas`, datos);
  }

  actualizarEmpresa(id: string, datos: EmpresaRequest): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.api}/empresas/${id}`, datos);
  }

  cambiarEstadoEmpresa(id: string, activa: boolean): Observable<Empresa> {
    return this.http.patch<Empresa>(`${this.api}/empresas/${id}/estado`, { activa });
  }

  parametrosLegales(): Observable<ParametroLegal[]> {
    return this.http.get<ParametroLegal[]>(`${this.api}/parametros-legales`);
  }

  crearParametroLegal(datos: ParametroLegalRequest): Observable<ParametroLegal> {
    return this.http.post<ParametroLegal>(`${this.api}/parametros-legales`, datos);
  }
}

export const ROL_TEXTO: Record<Rol, string> = {
  ADMIN_SAAS: 'Administrador de la plataforma',
  ADMIN_EMPRESA: 'Administrador de empresa',
  RRHH: 'Recursos Humanos',
  EMPLEADO: 'Empleado',
};
