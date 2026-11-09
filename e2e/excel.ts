import ExcelJS from 'exceljs';

/** Columnas de la plantilla de importación (las mismas que descarga la pantalla de importación). */
export const COLUMNAS = [
  'dni',
  'nombres',
  'apellidos',
  'fecha_nacimiento',
  'email',
  'telefono',
  'fecha_ingreso',
  'area',
  'cargo',
  'tipo_contrato',
  'fecha_fin_contrato',
  'sueldo_basico',
  'jornada_semanal',
  'regimen_pensionario',
  'afp',
  'tipo_comision',
] as const;

export interface FilaEmpleado {
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  area: string;
  cargo: string;
}

/** Arma un .xlsx con una fila válida por empleado (contrato indefinido, ONP, S/ 1 500). */
export async function excelDeEmpleados(filas: FilaEmpleado[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Empleados');
  hoja.addRow([...COLUMNAS]);
  for (const f of filas) {
    hoja.addRow([
      f.dni,
      f.nombres,
      f.apellidos,
      '1995-04-20',
      f.email,
      '987654321',
      '2026-11-03',
      f.area,
      f.cargo,
      'INDEFINIDO',
      '',
      '1500',
      '48',
      'ONP',
      '',
      '',
    ]);
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}
