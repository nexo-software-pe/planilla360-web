import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, reduce, shareReplay, tap } from 'rxjs';
import { API_URL } from '../../core/config/api-url';
import { Pagina } from '../../shared/pagina';

export type EstadoEmpleado = 'ACTIVO' | 'VACACIONES' | 'LICENCIA' | 'CESADO';

export interface Empleado {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  email: string | null;
  telefono: string | null;
  fechaIngreso: string;
  fechaCese: string | null;
  areaId: string;
  cargoId: string;
  jefeId: string | null;
  estado: EstadoEmpleado;
}

export interface EmpleadoRequest {
  dni: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  email: string | null;
  telefono: string | null;
  fechaIngreso: string;
  areaId: string;
  cargoId: string;
  jefeId: string | null;
}

export interface FiltrosEmpleados {
  q?: string;
  areaId?: string;
  cargoId?: string;
  estado?: EstadoEmpleado | '';
  ingresoDesde?: string;
  ingresoHasta?: string;
}

export type TipoContrato = 'INDEFINIDO' | 'PLAZO_FIJO' | 'PART_TIME';
export type RegimenPensionario = 'ONP' | 'AFP';

export interface Contrato {
  id: string;
  empleadoId: string;
  tipo: TipoContrato;
  fechaInicio: string;
  fechaFin: string | null;
  sueldoBasico: number;
  jornadaSemanal: number;
  diasLaborables: number;
  regimenPensionario: RegimenPensionario;
  afpId: string | null;
  tipoComision: 'FLUJO' | 'MIXTA' | null;
  cuspp: string | null;
}

export type ContratoRequest = Omit<Contrato, 'id' | 'empleadoId'>;

export type Parentesco = 'HIJO' | 'CONYUGE' | 'CONVIVIENTE' | 'PADRE' | 'MADRE';

export interface Familiar {
  id: string;
  empleadoId: string;
  nombres: string;
  parentesco: Parentesco;
  fechaNacimiento: string;
  estudia: boolean;
}

export type FamiliarRequest = Omit<Familiar, 'id' | 'empleadoId'>;

export interface ErrorFila {
  fila: number;
  campo: string | null;
  mensaje: string;
}

export interface ResultadoImportacion {
  totalFilas: number;
  validas: number;
  importadas: number;
  simulacion: boolean;
  errores: ErrorFila[];
}

export interface PersonaDni {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

const TAMANO_DIRECTORIO = 100;

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private directorio$: Observable<Empleado[]> | null = null;

  listar(filtros: FiltrosEmpleados, pagina: number, tamano: number): Observable<Pagina<Empleado>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', 'apellidos,asc');
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') params = params.set(clave, valor);
    }
    return this.http.get<Pagina<Empleado>>(`${this.api}/empleados`, { params });
  }

  /** Todos los empleados de la empresa (para resolver nombres y elegir jefe). En memoria. */
  directorio(): Observable<Empleado[]> {
    this.directorio$ ??= this.listar({}, 0, TAMANO_DIRECTORIO).pipe(
      expand((p) =>
        p.pagina + 1 < p.totalPaginas ? this.listar({}, p.pagina + 1, TAMANO_DIRECTORIO) : EMPTY,
      ),
      reduce((acc, p) => [...acc, ...p.contenido], [] as Empleado[]),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.directorio$;
  }

  olvidarDirectorio(): void {
    this.directorio$ = null;
  }

  obtener(id: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.api}/empleados/${id}`);
  }

  crear(datos: EmpleadoRequest): Observable<Empleado> {
    return this.http
      .post<Empleado>(`${this.api}/empleados`, datos)
      .pipe(tap(() => this.olvidarDirectorio()));
  }

  actualizar(id: string, datos: EmpleadoRequest): Observable<Empleado> {
    return this.http
      .put<Empleado>(`${this.api}/empleados/${id}`, datos)
      .pipe(tap(() => this.olvidarDirectorio()));
  }

  cesar(id: string, fechaCese: string): Observable<Empleado> {
    return this.http
      .patch<Empleado>(`${this.api}/empleados/${id}/cese`, { fechaCese })
      .pipe(tap(() => this.olvidarDirectorio()));
  }

  contratos(id: string): Observable<Contrato[]> {
    return this.http.get<Contrato[]>(`${this.api}/empleados/${id}/contratos`);
  }

  crearContrato(id: string, datos: ContratoRequest): Observable<Contrato> {
    return this.http.post<Contrato>(`${this.api}/empleados/${id}/contratos`, datos);
  }

  familiares(id: string): Observable<Familiar[]> {
    return this.http.get<Familiar[]>(`${this.api}/empleados/${id}/familiares`);
  }

  crearFamiliar(id: string, datos: FamiliarRequest): Observable<Familiar> {
    return this.http.post<Familiar>(`${this.api}/empleados/${id}/familiares`, datos);
  }

  consultarDni(dni: string): Observable<PersonaDni> {
    return this.http.get<PersonaDni>(`${this.api}/consultas/dni/${dni}`);
  }

  importar(archivo: File, simular: boolean): Observable<ResultadoImportacion> {
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    return this.http
      .post<ResultadoImportacion>(`${this.api}/importaciones/empleados`, formulario, {
        params: new HttpParams().set('simular', simular),
      })
      .pipe(tap(() => !simular && this.olvidarDirectorio()));
  }

  plantillaImportacion(): Observable<Blob> {
    return this.http.get(`${this.api}/importaciones/empleados/plantilla.xlsx`, {
      responseType: 'blob',
    });
  }

  /** Nombre completo para listas (`Apellidos, Nombres`). */
  static nombreCompleto(e: Pick<Empleado, 'nombres' | 'apellidos'>): string {
    return `${e.apellidos}, ${e.nombres}`;
  }
}

/** Mapa id → empleado a partir del directorio. */
export function indexarPorId(empleados: Empleado[]): Map<string, Empleado> {
  return new Map(empleados.map((e) => [e.id, e]));
}
