import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api-url';

export type EstadoSolicitud =
  | 'SOLICITADA'
  | 'APROBADA_JEFE'
  | 'APROBADA_RRHH'
  | 'EN_GOCE'
  | 'FINALIZADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export interface SolicitudVacaciones {
  id: string;
  empleadoId: string;
  periodoId: string;
  desde: string;
  hasta: string;
  dias: number;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
}

export type EstadoPermiso = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO';
export type TipoPermiso = 'MEDICO' | 'PERSONAL' | 'LICENCIA';

export interface Permiso {
  id: string;
  empleadoId: string;
  tipo: TipoPermiso;
  desde: string;
  hasta: string;
  dias: number;
  conGoce: boolean;
  motivo: string | null;
  estado: EstadoPermiso;
  motivoRechazo: string | null;
}

export interface VacacionPendiente {
  empleadoId: string;
  trabajador: string;
  periodoDesde: string;
  periodoHasta: string;
  saldoDias: number;
  saldoTotalDias: number;
  vencido: boolean;
}

export interface DetallePeriodo {
  periodoId: string;
  desde: string;
  hasta: string;
  diasGanados: number;
  diasGozados: number;
  diasVendidos: number;
  diasReservados: number;
  diasDisponibles: number;
}

export interface SaldoVacaciones {
  diasDisponibles: number;
  periodos: DetallePeriodo[];
}

export interface PermisoRequest {
  tipo: TipoPermiso;
  desde: string;
  hasta: string;
  conGoce: boolean;
  motivo: string | null;
}

export const TIPO_PERMISO: Record<TipoPermiso, string> = {
  MEDICO: 'Médico',
  PERSONAL: 'Personal',
  LICENCIA: 'Licencia',
};

@Injectable({ providedIn: 'root' })
export class VacacionesService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  miSaldo(): Observable<SaldoVacaciones> {
    return this.http.get<SaldoVacaciones>(`${this.api}/vacaciones/saldo/mio`);
  }

  solicitar(desde: string, hasta: string): Observable<SolicitudVacaciones> {
    return this.http.post<SolicitudVacaciones>(`${this.api}/vacaciones/solicitudes`, {
      desde,
      hasta,
    });
  }

  cancelar(id: string): Observable<SolicitudVacaciones> {
    return this.http.post<SolicitudVacaciones>(
      `${this.api}/vacaciones/solicitudes/${id}/cancelar`,
      {},
    );
  }

  crearPermiso(datos: PermisoRequest): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.api}/permisos`, datos);
  }

  solicitudes(estado?: EstadoSolicitud, empleadoId?: string): Observable<SolicitudVacaciones[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (empleadoId) params = params.set('empleadoId', empleadoId);
    return this.http.get<SolicitudVacaciones[]>(`${this.api}/vacaciones/solicitudes`, { params });
  }

  aprobarJefe(id: string): Observable<SolicitudVacaciones> {
    return this.http.post<SolicitudVacaciones>(
      `${this.api}/vacaciones/solicitudes/${id}/aprobar-jefe`,
      {},
    );
  }

  aprobarRrhh(id: string): Observable<SolicitudVacaciones> {
    return this.http.post<SolicitudVacaciones>(
      `${this.api}/vacaciones/solicitudes/${id}/aprobar-rrhh`,
      {},
    );
  }

  rechazar(id: string, motivo: string): Observable<SolicitudVacaciones> {
    return this.http.post<SolicitudVacaciones>(
      `${this.api}/vacaciones/solicitudes/${id}/rechazar`,
      { motivo },
    );
  }

  permisos(estado?: EstadoPermiso): Observable<Permiso[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<Permiso[]>(`${this.api}/permisos`, { params });
  }

  aprobarPermiso(id: string): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.api}/permisos/${id}/aprobar`, {});
  }

  rechazarPermiso(id: string, motivo: string): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.api}/permisos/${id}/rechazar`, { motivo });
  }

  saldos(): Observable<VacacionPendiente[]> {
    return this.http.get<VacacionPendiente[]>(`${this.api}/reportes/vacaciones-pendientes`);
  }
}
