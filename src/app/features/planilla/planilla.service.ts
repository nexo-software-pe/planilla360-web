import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api-url';
import { OMITIR_CARGA } from '../../core/http/contexto-http';
import { Pagina } from '../../shared/pagina';

export type TipoPlanilla = 'MENSUAL' | 'GRATIFICACION' | 'CTS';
export type EstadoPlanilla = 'BORRADOR' | 'CALCULADA' | 'CERRADA' | 'ANULADA';

export interface Planilla {
  id: string;
  periodo: string;
  tipo: TipoPlanilla;
  estado: EstadoPlanilla;
  trabajadores: number;
  totalIngresos: number;
  totalDescuentos: number;
  totalNeto: number;
  totalEssalud: number;
  cerradaEn: string | null;
}

export interface Concepto {
  codigo: string;
  descripcion: string;
  monto: number;
  tipo: 'INGRESO' | 'DESCUENTO' | 'APORTE_EMPLEADOR';
}

export interface LineaPlanilla {
  empleadoId: string;
  basico: number;
  asignacionFamiliar: number;
  horasExtra: number;
  bonos: number;
  gratificacion: number;
  bonificacionExtraordinaria: number;
  cts: number;
  regimenPensionario: string;
  descuentoPension: number;
  retencion5ta: number;
  descuentoAsistencia: number;
  otrosDescuentos: number;
  aporteEssalud: number;
  totalIngresos: number;
  totalDescuentos: number;
  neto: number;
  conceptos: Concepto[];
}

export interface Incidencia {
  codigo: string;
  mensaje: string;
}

export interface Validacion {
  valida: boolean;
  incidencias: Incidencia[];
}

/** Resultado de simular o generar una gratificación o una CTS. */
export interface ResultadoBeneficio {
  id?: string;
  periodo: string;
  tipo: TipoPlanilla;
  trabajadores: number;
  totalIngresos: number;
  totalDescuentos: number;
  totalNeto: number;
  totalEssalud: number;
  lineas: LineaPlanilla[];
}

export type EstadoBoleta = 'PENDIENTE' | 'GENERADA' | 'ENVIADA' | 'FALLIDA';

export interface Boleta {
  id: string;
  planillaId: string;
  empleadoId: string;
  periodo: string;
  tipo: string;
  estado: EstadoBoleta;
  generadaEn: string | null;
  enviadaEn: string | null;
}

export interface EstadoGeneracion {
  planillaId: string;
  estado: string;
  total: number;
  pendientes: number;
  generadas: number;
  enviadas: number;
  fallidas: number;
}

export interface FiltrosPlanillas {
  periodo?: string;
  tipo?: TipoPlanilla | '';
  estado?: EstadoPlanilla | '';
}

export interface CostoLaboral {
  area: string | null;
  cargo: string | null;
  nivel: string;
  trabajadores: number;
  ingresos: number;
  essalud: number;
  costoTotal: number;
}

export interface TardanzaPorArea {
  area: string;
  trabajador: string;
  posicion: number;
  dias: number;
  minutos: number;
}

@Injectable({ providedIn: 'root' })
export class PlanillaService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  listar(filtros: FiltrosPlanillas, pagina: number, tamano: number): Observable<Pagina<Planilla>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Pagina<Planilla>>(`${this.api}/planillas`, { params });
  }

  crear(periodo: string, tipo: TipoPlanilla = 'MENSUAL'): Observable<Planilla> {
    return this.http.post<Planilla>(`${this.api}/planillas`, { periodo, tipo });
  }

  obtener(id: string): Observable<Planilla> {
    return this.http.get<Planilla>(`${this.api}/planillas/${id}`);
  }

  calcular(id: string): Observable<Planilla> {
    return this.http.post<Planilla>(`${this.api}/planillas/${id}/calcular`, {});
  }

  lineas(id: string): Observable<LineaPlanilla[]> {
    return this.http.get<LineaPlanilla[]>(`${this.api}/planillas/${id}/lineas`);
  }

  validaciones(id: string): Observable<Validacion> {
    return this.http.get<Validacion>(`${this.api}/planillas/${id}/validaciones`);
  }

  /** El cierre es idempotente: repetir la misma clave devuelve el mismo resultado. */
  cerrar(id: string, claveIdempotencia: string): Observable<Planilla> {
    return this.http.post<Planilla>(
      `${this.api}/planillas/${id}/cerrar`,
      {},
      { headers: new HttpHeaders({ 'Idempotency-Key': claveIdempotencia }) },
    );
  }

  anular(id: string, motivo: string): Observable<Planilla> {
    return this.http.post<Planilla>(`${this.api}/planillas/${id}/anular`, { motivo });
  }

  registrarPago(id: string, fechaPago: string, referencia: string): Observable<unknown> {
    return this.http.post(`${this.api}/planillas/${id}/pago`, { fechaPago, referencia });
  }

  estadoBoletas(id: string): Observable<EstadoGeneracion> {
    // se consulta en sondeo: no debe encender la barra de carga global
    return this.http.get<EstadoGeneracion>(`${this.api}/planillas/${id}/boletas/estado`, {
      context: new HttpContext().set(OMITIR_CARGA, true),
    });
  }

  generarBoletas(id: string): Observable<EstadoGeneracion> {
    return this.http.post<EstadoGeneracion>(`${this.api}/planillas/${id}/boletas/generar`, {});
  }

  boletasDePlanilla(id: string, pagina: number, tamano: number): Observable<Pagina<Boleta>> {
    return this.http.get<Pagina<Boleta>>(`${this.api}/planillas/${id}/boletas`, {
      params: new HttpParams().set('page', pagina).set('size', tamano),
    });
  }

  beneficio(
    tipo: 'GRATIFICACION' | 'CTS',
    periodo: string,
    simular: boolean,
  ): Observable<ResultadoBeneficio> {
    const ruta = tipo === 'GRATIFICACION' ? 'gratificacion' : 'cts';
    return this.http.post<ResultadoBeneficio>(`${this.api}/planillas/${ruta}`, {
      periodo,
      simular,
    });
  }

  boletasMias(pagina: number, tamano: number): Observable<Pagina<Boleta>> {
    return this.http.get<Pagina<Boleta>>(`${this.api}/boletas/mias`, {
      params: new HttpParams().set('page', pagina).set('size', tamano),
    });
  }

  pdfBoleta(id: string): Observable<Blob> {
    return this.http.get(`${this.api}/boletas/${id}/pdf`, { responseType: 'blob' });
  }

  planillaMensualXlsx(periodo: string, tipo: TipoPlanilla): Observable<Blob> {
    return this.http.get(`${this.api}/reportes/planilla-mensual.xlsx`, {
      params: new HttpParams().set('periodo', periodo).set('tipo', tipo),
      responseType: 'blob',
    });
  }

  costoLaboral(periodo: string): Observable<CostoLaboral[]> {
    return this.http.get<CostoLaboral[]>(`${this.api}/reportes/costo-laboral`, {
      params: new HttpParams().set('periodo', periodo),
    });
  }

  tardanzasPorArea(periodo: string, top: number): Observable<TardanzaPorArea[]> {
    return this.http.get<TardanzaPorArea[]>(`${this.api}/reportes/tardanzas-por-area`, {
      params: new HttpParams().set('periodo', periodo).set('top', top),
    });
  }
}
