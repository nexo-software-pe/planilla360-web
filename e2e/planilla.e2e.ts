import { APIRequestContext, expect, test } from '@playwright/test';
import { API, USUARIOS, iniciarSesion, tokenApi } from './utils';

interface PlanillaApi {
  id: string;
  periodo: string;
  tipo: string;
  estado: string;
}

async function buscarPlanilla(
  request: APIRequestContext,
  periodo: string,
  tipo = 'MENSUAL',
): Promise<PlanillaApi | undefined> {
  const token = await tokenApi(request, USUARIOS.rrhh);
  const r = await request.get(`${API}/planillas?periodo=${periodo}&tipo=${tipo}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return ((await r.json()) as { contenido: PlanillaApi[] }).contenido.find(
    (p) => p.estado !== 'ANULADA',
  );
}

const mesDeHoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }).slice(0, 7);

test.describe('Planilla (RRHH)', () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, 'rrhh');
  });

  test('un periodo sin asistencia queda con validaciones y "Cerrar planilla" deshabilitado', async ({
    page,
    request,
  }) => {
    // marzo de 2026 es anterior a los meses con asistencia del seed
    const periodo = '2026-03';
    const existente = await buscarPlanilla(request, periodo);

    if (existente) {
      await page.goto(`/panel/planilla/${existente.id}`);
    } else {
      await page.goto('/panel/planilla');
      await page.getByRole('button', { name: 'Nueva planilla' }).click();
      await page.getByLabel('Periodo').first().fill(periodo);
      await page.getByRole('button', { name: 'Crear planilla' }).click();
      await expect(page).toHaveURL(/\/panel\/planilla\/[\w-]+$/);
    }

    // creada en borrador: se calcula y aparecen las líneas y los totales
    const calcular = page.getByRole('button', { name: /Calcular planilla|Recalcular/ });
    await calcular.click();
    await expect(page.getByRole('region', { name: 'Totales de la planilla' })).toBeVisible();

    // las validaciones se listan arriba de la tabla y bloquean el cierre
    const validaciones = page.locator('#validaciones');
    await expect(validaciones).toBeVisible();
    await expect(validaciones).toContainText(/validaci/);
    await expect(page.getByRole('button', { name: 'Cerrar planilla' })).toBeDisabled();
  });

  test('flujo completo: crear periodo, calcular, revisar, cerrar con idempotencia y seguir las boletas', async ({
    page,
    request,
  }) => {
    // para poder repetir la prueba: si el mes ya quedó cerrado (por otra corrida), el administrador
    // de empresa lo anula por API y se vuelve a crear desde la pantalla
    const mes = mesDeHoy();
    const existente = await buscarPlanilla(request, mes);
    if (existente?.estado === 'CERRADA') {
      const token = await tokenApi(request, USUARIOS.admin);
      const r = await request.post(`${API}/planillas/${existente.id}/anular`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { motivo: 'Repeticion de la prueba E2E' },
      });
      expect(r.ok(), 'anular la planilla cerrada').toBeTruthy();
    }

    if (existente && existente.estado !== 'CERRADA') {
      await page.goto(`/panel/planilla/${existente.id}`);
    } else {
      await page.goto('/panel/planilla');
      await page.getByRole('button', { name: 'Nueva planilla' }).click();
      await page.getByLabel('Periodo').first().fill(mes);
      await page.getByRole('button', { name: 'Crear planilla' }).click();
      await expect(page).toHaveURL(/\/panel\/planilla\/[\w-]+$/);
    }

    await page.getByRole('button', { name: /Calcular planilla|Recalcular/ }).click();
    await expect(page.getByRole('region', { name: 'Totales de la planilla' })).toBeVisible();

    // vista previa de la boleta de un trabajador
    await page
      .getByRole('button', { name: /Vista previa de la boleta de/ })
      .first()
      .click();
    const boleta = page.getByRole('complementary', { name: 'Vista previa de la boleta' });
    await expect(boleta).toContainText('Neto a pagar');

    // con la planilla sin validaciones pendientes, se puede cerrar
    const cerrar = page.getByRole('button', { name: 'Cerrar planilla' });
    await expect(cerrar).toBeEnabled();

    // el cierre manda una Idempotency-Key
    const peticion = page.waitForRequest(
      (r) => r.url().endsWith('/cerrar') && r.method() === 'POST',
    );
    await cerrar.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar planilla' }).click();
    expect((await peticion).headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.getByText('Cerrada', { exact: true }).first()).toBeVisible();

    // las boletas avanzan solas hasta terminar y cada una se puede descargar
    const avance = page.getByRole('status').filter({ hasText: /generadas/ });
    await expect(avance).toContainText(/(\d+) de \1 generadas/, { timeout: 120_000 });
    const descarga = page.waitForEvent('download');
    await page
      .getByRole('button', { name: /Descargar la boleta de/ })
      .first()
      .click();
    expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('simula la gratificación de julio y la CTS de mayo', async ({ page }) => {
    await page.goto('/panel/beneficios');
    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByRole('heading', { name: /Simulación de gratificación/ })).toBeVisible();
    await expect(page.getByRole('table', { name: /Detalle por trabajador/ })).toContainText('S/');

    await page.getByRole('combobox', { name: /Beneficio/ }).click();
    await page.getByRole('option', { name: 'CTS' }).click();
    await page.getByLabel('Periodo').fill('2026-05');
    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByRole('heading', { name: /Simulación de CTS/ })).toBeVisible();
  });

  test('rechaza simular un mes que no corresponde al beneficio', async ({ page }) => {
    await page.goto('/panel/beneficios');
    await page.getByLabel('Periodo').fill('2026-08');
    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByText(/corresponde a julio o diciembre/)).toBeVisible();
  });

  test('reportes: costo laboral y descarga de la planilla en Excel', async ({ page }) => {
    await page.goto('/panel/reportes');
    await page.getByLabel('Periodo').first().fill('2026-10');
    await page.getByRole('button', { name: 'Ver reportes' }).click();
    await expect(page.getByRole('cell', { name: 'Total general' })).toBeVisible();

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar planilla en Excel' }).click();
    expect((await descarga).suggestedFilename()).toBe('planilla-mensual-2026-10.xlsx');
  });
});
