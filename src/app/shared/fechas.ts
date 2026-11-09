/** Utilidades de fecha en hora local (nunca `toISOString`, que corre el día por la zona horaria). */
function dos(n: number): string {
  return String(n).padStart(2, '0');
}

export function aIso(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function hoyIso(): string {
  return aIso(new Date());
}

/** Mes actual como `yyyy-MM`, el formato que usan la API y `<input type="month">`. */
export function mesActual(): string {
  return hoyIso().slice(0, 7);
}

/** `2026-11-09` → `09/11/2026`. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

/** `2026-11-09T14:05:00-05:00` → `09/11/2026 14:05`. */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-11` → `noviembre de 2026`. */
export function nombreDeMes(mes: string): string {
  const [a, m] = mes.split('-');
  const nombre = MESES[Number(m) - 1];
  return nombre ? `${nombre} de ${a}` : mes;
}

/** Minutos → `1 h 05 min`. */
export function formatearMinutos(minutos: number): string {
  if (!minutos) return '0 min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h} h ${dos(m)} min` : `${m} min`;
}
