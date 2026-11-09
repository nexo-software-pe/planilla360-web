import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api-url';

export type EstadoAsistencia =
  'PRESENTE' | 'TARDANZA' | 'FALTA' | 'JUSTIFICADA' | 'FERIADO' | 'DESCANSO' | 'INCOMPLETA';

export interface AsistenciaDiaria {
  fecha: string;
  estado: EstadoAsistencia;
  minutosTardanza: number;
  minutosExtra: number;
}

export interface ResumenMensual {
  empleadoId: string;
  nombreCompleto: string;
  diasAsistidos: number;
  diasJustificados: number;
  faltas: number;
  tardanzas: number;
  minutosTardanza: number;
  minutosExtra: number;
}

export type EstadoHoraExtra = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface HoraExtra {
  id: string;
  empleadoId: string;
  fecha: string;
  horas: number;
  motivo: string | null;
  estado: EstadoHoraExtra;
  aprobadoPor: string | null;
}

export type DiaSemana =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const DIAS_SEMANA: readonly { valor: DiaSemana; corto: string; largo: string }[] = [
  { valor: 'MONDAY', corto: 'Lun', largo: 'Lunes' },
  { valor: 'TUESDAY', corto: 'Mar', largo: 'Martes' },
  { valor: 'WEDNESDAY', corto: 'Mié', largo: 'Miércoles' },
  { valor: 'THURSDAY', corto: 'Jue', largo: 'Jueves' },
  { valor: 'FRIDAY', corto: 'Vie', largo: 'Viernes' },
  { valor: 'SATURDAY', corto: 'Sáb', largo: 'Sábado' },
  { valor: 'SUNDAY', corto: 'Dom', largo: 'Domingo' },
];

export interface Horario {
  id: string;
  nombre: string;
  entrada: string;
  salida: string;
  toleranciaMin: number;
  refrigerioMin: number;
  dias: DiaSemana[];
}

export type HorarioRequest = Omit<Horario, 'id'>;

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  resumen(mes: string): Observable<ResumenMensual[]> {
    return this.http.get<ResumenMensual[]>(`${this.api}/asistencia/resumen`, {
      params: new HttpParams().set('mes', mes),
    });
  }

  detalle(empleadoId: string, mes: string): Observable<AsistenciaDiaria[]> {
    return this.http.get<AsistenciaDiaria[]>(`${this.api}/asistencia`, {
      params: new HttpParams().set('empleadoId', empleadoId).set('mes', mes),
    });
  }

  horasExtra(estado?: EstadoHoraExtra): Observable<HoraExtra[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<HoraExtra[]>(`${this.api}/asistencia/horas-extra`, { params });
  }

  resolverHoraExtra(id: string, accion: 'APROBAR' | 'RECHAZAR'): Observable<HoraExtra> {
    return this.http.patch<HoraExtra>(`${this.api}/asistencia/horas-extra/${id}`, { accion });
  }

  horarios(): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${this.api}/horarios`);
  }

  crearHorario(datos: HorarioRequest): Observable<Horario> {
    return this.http.post<Horario>(`${this.api}/horarios`, datos);
  }

  asignarHorario(id: string, empleadoId: string, desde: string): Observable<void> {
    return this.http.post<void>(`${this.api}/horarios/${id}/asignaciones`, { empleadoId, desde });
  }
}
