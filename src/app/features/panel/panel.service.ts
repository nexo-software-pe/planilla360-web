import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { API_URL } from '../../core/config/api-url';
import { Pagina } from '../../shared/pagina';
import { AsistenciaService } from '../asistencia/asistencia.service';
import { EmpleadosService, Empleado } from '../empleados/empleados.service';
import { VacacionesService, VacacionPendiente } from '../vacaciones/vacaciones.service';

export type EstadoPlanilla = 'BORRADOR' | 'CALCULADA' | 'CERRADA' | 'ANULADA';

export interface PlanillaResumen {
  id: string;
  periodo: string;
  tipo: 'MENSUAL' | 'GRATIFICACION' | 'CTS';
  estado: EstadoPlanilla;
  trabajadores: number;
  totalIngresos: number;
  totalDescuentos: number;
  totalNeto: number;
  totalEssalud: number;
  cerradaEn: string | null;
}

export interface Cumpleanos {
  nombre: string;
  dia: number;
  edad: number;
}

export interface IndicadoresRrhh {
  activos: number;
  enVacaciones: number;
  conLicencia: number;
  planilla: PlanillaResumen | null;
  vacacionesPorAprobar: number;
  permisosPorAprobar: number;
  horasExtraPendientes: number;
  tardanzasDelMes: number;
  periodosVencidos: VacacionPendiente[];
  cumpleanos: Cumpleanos[];
}

/** Indicadores del panel de RRHH: se arman con los mismos endpoints que usan las pantallas. */
@Injectable({ providedIn: 'root' })
export class PanelService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private readonly empleados = inject(EmpleadosService);
  private readonly vacaciones = inject(VacacionesService);
  private readonly asistencia = inject(AsistenciaService);

  planillaDelMes(periodo: string): Observable<PlanillaResumen | null> {
    return this.http
      .get<Pagina<PlanillaResumen>>(`${this.api}/planillas`, {
        params: new HttpParams().set('periodo', periodo).set('tipo', 'MENSUAL').set('size', 5),
      })
      .pipe(
        // si hubo una planilla anulada y otra nueva, manda la que no está anulada
        map((p) => p.contenido.find((x) => x.estado !== 'ANULADA') ?? p.contenido[0] ?? null),
      );
  }

  private contar(estado: Empleado['estado']): Observable<number> {
    return this.empleados.listar({ estado }, 0, 1).pipe(map((p) => p.totalElementos));
  }

  indicadoresRrhh(mes: string): Observable<IndicadoresRrhh> {
    return forkJoin({
      activos: this.contar('ACTIVO'),
      enVacaciones: this.contar('VACACIONES'),
      conLicencia: this.contar('LICENCIA'),
      planilla: this.planillaDelMes(mes),
      vacaciones: forkJoin([
        this.vacaciones.solicitudes('SOLICITADA'),
        this.vacaciones.solicitudes('APROBADA_JEFE'),
      ]).pipe(map(([a, b]) => a.length + b.length)),
      permisos: this.vacaciones.permisos('SOLICITADO').pipe(map((p) => p.length)),
      horasExtra: this.asistencia.horasExtra('PENDIENTE').pipe(map((h) => h.length)),
      // el resumen puede no existir aún (mes sin consolidar): no debe tumbar el panel
      tardanzas: this.asistencia.resumen(mes).pipe(
        map((filas) => filas.reduce((acc, f) => acc + f.tardanzas, 0)),
        catchError(() => of(0)),
      ),
      saldos: this.vacaciones.saldos(),
      directorio: this.empleados.directorio(),
    }).pipe(
      map((r) => ({
        activos: r.activos,
        enVacaciones: r.enVacaciones,
        conLicencia: r.conLicencia,
        planilla: r.planilla,
        vacacionesPorAprobar: r.vacaciones,
        permisosPorAprobar: r.permisos,
        horasExtraPendientes: r.horasExtra,
        tardanzasDelMes: r.tardanzas,
        periodosVencidos: r.saldos.filter((s) => s.vencido),
        cumpleanos: cumpleanosDelMes(r.directorio, mes),
      })),
    );
  }
}

function cumpleanosDelMes(empleados: Empleado[], mes: string): Cumpleanos[] {
  const [anio, m] = mes.split('-').map(Number);
  return empleados
    .filter((e) => e.estado !== 'CESADO' && Number(e.fechaNacimiento.slice(5, 7)) === m)
    .map((e) => ({
      nombre: `${e.nombres} ${e.apellidos}`,
      dia: Number(e.fechaNacimiento.slice(8, 10)),
      edad: anio - Number(e.fechaNacimiento.slice(0, 4)),
    }))
    .sort((a, b) => a.dia - b.dia);
}
