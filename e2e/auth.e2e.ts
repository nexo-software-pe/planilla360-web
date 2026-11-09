import { expect, test } from '@playwright/test';
import { RolPrueba, USUARIOS, iniciarSesion } from './utils';

const MENU: Record<RolPrueba, string[]> = {
  saas: ['Inicio', 'Empresas', 'Parámetros legales'],
  admin: ['Inicio', 'Empleados', 'Planilla', 'Usuarios', 'Áreas y cargos', 'Auditoría'],
  rrhh: ['Inicio', 'Empleados', 'Asistencia', 'Vacaciones y permisos', 'Planilla', 'Reportes'],
  empleado: ['Inicio', 'Asistencia', 'Vacaciones', 'Permisos', 'Boletas'],
};

const NO_VISIBLE: Record<RolPrueba, string[]> = {
  saas: ['Empleados', 'Planilla'],
  admin: ['Empresas', 'Parámetros legales'],
  rrhh: ['Usuarios', 'Auditoría', 'Empresas'],
  empleado: ['Empleados', 'Planilla', 'Usuarios'],
};

test.describe('Inicio de sesión y menú por rol', () => {
  for (const rol of Object.keys(USUARIOS) as RolPrueba[]) {
    test(`${rol}: entra a su pantalla y ve solo las opciones de su rol`, async ({ page }) => {
      await iniciarSesion(page, rol);
      const menu = page.getByRole('navigation').first();
      for (const opcion of MENU[rol]) {
        await expect(menu.getByRole('link', { name: opcion, exact: true })).toBeVisible();
      }
      for (const opcion of NO_VISIBLE[rol]) {
        await expect(menu.getByRole('link', { name: opcion, exact: true })).toHaveCount(0);
      }
    });
  }

  test('una contraseña incorrecta muestra el error sin entrar', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(USUARIOS.rrhh);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta-1');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    await expect(page).toHaveURL(/\/login/);
  });

  test('RRHH no puede abrir pantallas del administrador de empresa (403)', async ({ page }) => {
    await iniciarSesion(page, 'rrhh');
    await page.goto('/panel/usuarios');
    await expect(page).toHaveURL(/acceso-denegado/);
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
  });

  test('el empleado no puede abrir el panel de administración', async ({ page }) => {
    await iniciarSesion(page, 'empleado');
    await page.goto('/panel');
    await expect(page).toHaveURL(/acceso-denegado/);
  });

  test('sin sesión, una ruta protegida lleva al login y vuelve después de ingresar', async ({
    page,
  }) => {
    await page.goto('/panel/empleados');
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    await page.getByLabel('Correo electrónico').fill(USUARIOS.rrhh);
    await page.getByLabel('Contraseña').fill(process.env['E2E_PASSWORD'] ?? 'Planilla360-Local1');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/panel\/empleados$/);
  });
});

test.describe('Refresh transparente del token (contra la API real)', () => {
  test('un 401 por token vencido se resuelve renovando la sesión sin que la persona lo note', async ({
    page,
  }) => {
    await iniciarSesion(page, 'rrhh');

    // la primera llamada a empleados sale con un access token inválido: la API real responde 401
    let invalidado = false;
    await page.route('**/api/v1/empleados?*', async (route) => {
      if (!invalidado) {
        invalidado = true;
        await route.continue({
          headers: { ...route.request().headers(), authorization: 'Bearer token-vencido' },
        });
      } else {
        await route.continue();
      }
    });

    const refresh = page.waitForResponse(
      (r) => r.url().endsWith('/auth/refresh') && r.request().method() === 'POST',
    );
    await page.getByRole('link', { name: 'Empleados', exact: true }).click();
    expect((await refresh).status()).toBe(200);

    // la pantalla terminó cargando con datos y la persona siguió en su sitio
    await expect(page).toHaveURL(/\/panel\/empleados$/);
    await expect(page.getByRole('table', { name: /Empleados/ })).toBeVisible();
    await expect(page.getByRole('row')).not.toHaveCount(1);
  });

  test('si el refresh token ya no sirve, vuelve al login recordando la pantalla', async ({
    page,
  }) => {
    await iniciarSesion(page, 'rrhh');
    await page.evaluate(() => localStorage.setItem('planilla360.refresh', 'refresh-invalido'));

    let invalidado = false;
    await page.route('**/api/v1/empleados?*', async (route) => {
      if (!invalidado) {
        invalidado = true;
        await route.continue({
          headers: { ...route.request().headers(), authorization: 'Bearer token-vencido' },
        });
      } else {
        await route.continue();
      }
    });
    await page.getByRole('link', { name: 'Empleados', exact: true }).click();
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fpanel%2Fempleados/);
  });
});
