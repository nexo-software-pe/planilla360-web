import path from 'node:path';
import { expect, test } from '@playwright/test';
import { excelDeEmpleados } from './excel';
import { dniUnico, esperarToast, iniciarSesion, sufijo } from './utils';

test.describe('Empleados (RRHH)', () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, 'rrhh');
  });

  test('crea un empleado con su contrato y lo encuentra en la lista', async ({ page }) => {
    const dni = dniUnico();
    const apellidos = `Alta E2E ${sufijo()}`;

    await page.goto('/panel/empleados/nuevo');

    // la validación aparece antes de guardar
    await page.getByLabel('DNI').fill('123');
    await page.getByRole('button', { name: 'Crear empleado' }).click();
    await expect(page.getByText('El DNI debe tener 8 dígitos.')).toBeVisible();

    await page.getByLabel('DNI').fill(dni);
    await page.getByLabel('Nombres').fill('Elena');
    await page.getByLabel('Apellidos').fill(apellidos);
    await page.getByLabel('Fecha de nacimiento').fill('1993-07-21');
    await page.getByLabel('Correo electrónico').fill(`alta.${dni}@textilesandinos.ejemplo.pe`);
    await page.getByLabel('Teléfono').fill('987123456');
    await page.getByLabel('Fecha de ingreso').fill('2026-11-02');
    await page.getByRole('combobox', { name: /Área/ }).click();
    await page.getByRole('option', { name: 'Producción' }).click();
    await page.getByRole('combobox', { name: /Cargo/ }).click();
    await page.getByRole('option', { name: 'Operario de tejeduría' }).click();
    await page.getByRole('button', { name: 'Crear empleado' }).click();

    // lleva a la ficha, directo a la pestaña de contratos, y avisa que falta el contrato
    await expect(page).toHaveURL(/\/panel\/empleados\/[\w-]+\?pestana=contratos/);
    await expect(page.getByText('Este empleado aún no tiene contratos')).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo contrato' }).click();
    await page.getByRole('textbox', { name: 'Inicio', exact: true }).fill('2026-11-02');
    await page.getByLabel('Sueldo básico (S/)').fill('1500');
    await page.getByRole('button', { name: 'Guardar contrato' }).click();
    await esperarToast(page, 'Contrato registrado.');
    await expect(page.getByRole('row', { name: /Indefinido.*S\/ 1 500,00/ })).toBeVisible();

    // aparece en la lista al buscarlo por DNI
    await page.goto('/panel/empleados');
    await page.getByRole('searchbox', { name: /Buscar/ }).fill(dni);
    await expect(page.getByRole('row', { name: new RegExp(apellidos) })).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(2); // encabezado + el empleado
  });

  test('importa un Excel: valida primero, muestra errores por fila e importa las válidas', async ({
    page,
  }) => {
    const [a, b] = [dniUnico(), dniUnico()];
    const archivo = await excelDeEmpleados([
      {
        dni: a,
        nombres: 'Rita',
        apellidos: `Excel ${sufijo()}`,
        email: `rita.${a}@empresa.pe`,
        area: 'Producción',
        cargo: 'Operario de tejeduría',
      },
      {
        dni: b,
        nombres: 'Saúl',
        apellidos: `Excel ${sufijo()}`,
        email: `saul.${b}@empresa.pe`,
        area: 'Ventas',
        cargo: 'Ejecutivo de ventas',
      },
      // fila con error: DNI incompleto
      {
        dni: '123',
        nombres: 'Error',
        apellidos: 'Fila',
        email: 'error@empresa.pe',
        area: 'Ventas',
        cargo: 'Ejecutivo de ventas',
      },
    ]);

    await page.goto('/panel/empleados/importar');
    await page.getByLabel('Archivo de Excel').setInputFiles({
      name: 'empleados-e2e.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: archivo,
    });
    await page.getByRole('button', { name: 'Validar archivo' }).click();

    const resultado = page
      .getByRole('region', { name: /Resultado de la validación/ })
      .or(page.locator('section', { hasText: 'Resultado de la validación' }));
    await expect(resultado).toContainText('3 filas leídas');
    await expect(resultado).toContainText('2 válidas');
    await expect(resultado).toContainText('1 con errores');
    await expect(page.getByRole('table', { name: /Errores por fila/ })).toContainText(
      'El DNI debe tener 8 dígitos.',
    );

    await page.getByRole('button', { name: 'Importar 2 filas válidas' }).click();
    await esperarToast(page, 'Se importaron 2 empleados.');

    await page.goto('/panel/empleados');
    await page.getByRole('searchbox', { name: /Buscar/ }).fill(a);
    await expect(page.getByRole('row', { name: new RegExp(a) })).toBeVisible();
  });

  test('la plantilla de ejemplo del repositorio se lee completa al validarla', async ({ page }) => {
    await page.goto('/panel/empleados/importar');
    await page
      .getByLabel('Archivo de Excel')
      .setInputFiles(path.join(__dirname, 'fixtures', 'plantilla-empleados-ejemplo.xlsx'));
    await page.getByRole('button', { name: 'Validar archivo' }).click();
    // son 2 filas; si ya se importaron en otra corrida, la API las marca como DNI existente
    await expect(page.locator('section', { hasText: 'Resultado de la validación' })).toContainText(
      '2 filas leídas',
    );
  });

  test('descarga la plantilla de importación', async ({ page }) => {
    await page.goto('/panel/empleados/importar');
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar plantilla' }).click();
    expect((await descarga).suggestedFilename()).toBe('plantilla-empleados.xlsx');
  });
});
