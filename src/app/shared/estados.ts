import { Tono } from './etiqueta';

export interface EstadoVisual {
  texto: string;
  tono: Tono;
}

type Mapa = Record<string, EstadoVisual>;

export const ESTADO_EMPLEADO: Mapa = {
  ACTIVO: { texto: 'Activo', tono: 'exito' },
  VACACIONES: { texto: 'Vacaciones', tono: 'info' },
  LICENCIA: { texto: 'Licencia', tono: 'advertencia' },
  CESADO: { texto: 'Cesado', tono: 'neutro' },
};

export const ESTADO_ASISTENCIA: Mapa = {
  PRESENTE: { texto: 'Presente', tono: 'exito' },
  TARDANZA: { texto: 'Tardanza', tono: 'advertencia' },
  FALTA: { texto: 'Falta', tono: 'error' },
  JUSTIFICADA: { texto: 'Justificada', tono: 'info' },
  FERIADO: { texto: 'Feriado', tono: 'neutro' },
  DESCANSO: { texto: 'Descanso', tono: 'neutro' },
  INCOMPLETA: { texto: 'Incompleta', tono: 'advertencia' },
};

export const ESTADO_HORA_EXTRA: Mapa = {
  PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
  APROBADA: { texto: 'Aprobada', tono: 'exito' },
  RECHAZADA: { texto: 'Rechazada', tono: 'error' },
};

export const ESTADO_SOLICITUD_VACACIONES: Mapa = {
  SOLICITADA: { texto: 'Solicitada', tono: 'advertencia' },
  APROBADA_JEFE: { texto: 'Aprobada por jefe', tono: 'info' },
  APROBADA_RRHH: { texto: 'Aprobada por RRHH', tono: 'exito' },
  EN_GOCE: { texto: 'En goce', tono: 'info' },
  FINALIZADA: { texto: 'Finalizada', tono: 'neutro' },
  RECHAZADA: { texto: 'Rechazada', tono: 'error' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
};

export const ESTADO_PERMISO: Mapa = {
  SOLICITADO: { texto: 'Solicitado', tono: 'advertencia' },
  APROBADO: { texto: 'Aprobado', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazado', tono: 'error' },
};

export const ESTADO_PLANILLA: Mapa = {
  BORRADOR: { texto: 'Borrador', tono: 'neutro' },
  CALCULADA: { texto: 'Calculada', tono: 'info' },
  CERRADA: { texto: 'Cerrada', tono: 'exito' },
  ANULADA: { texto: 'Anulada', tono: 'error' },
};

export const ESTADO_ACTIVO: Mapa = {
  true: { texto: 'Activo', tono: 'exito' },
  false: { texto: 'Inactivo', tono: 'neutro' },
};

export function estadoVisual(mapa: Mapa, valor: string | boolean | null | undefined): EstadoVisual {
  if (valor === null || valor === undefined) return { texto: '—', tono: 'neutro' };
  return mapa[String(valor)] ?? { texto: String(valor), tono: 'neutro' };
}
