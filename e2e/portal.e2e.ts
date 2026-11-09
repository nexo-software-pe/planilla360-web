import { expect, test } from '@playwright/test';
import { crearEmpleadoConUsuario, esperarToast, iniciarSesion } from './utils';

test.describe('Portal del empleado (móvil)', () => {
  test('marca asistencia, pide un permiso y gestiona sus vacaciones', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request, { ingreso: '2024-01-08' });
    await iniciarSesion(page, 'empleado', { email: empleado.email, password: empleado.password });

    // Mi inicio: marcación, vacaciones disponibles y resumen
    await expect(page.getByRole('heading', { name: 'Marcación de asistencia' })).toBeVisible();
    await expect(page.getByText('60 días')).toBeVisible();
    await page.getByRole('button', { name: 'Marcar ahora' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Entrada registrada/ })).toBeVisible();

    // navegación inferior
    const barra = page.getByRole('navigation', { name: 'Navegación del portal' });
    await expect(barra).toBeVisible();

    // Mis permisos
    await barra.getByRole('link', { name: 'Permisos' }).click();
    await expect(page.getByRole('heading', { name: 'Mis permisos' })).toBeVisible();
    await page.getByLabel('Desde').fill('2027-07-12');
    await page.getByLabel('Hasta').fill('2027-07-12');
    await page.getByLabel('Motivo (opcional)').fill('Trámite en el banco');
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await esperarToast(page, 'Permiso solicitado');
    await expect(page.getByText('Solicitado', { exact: true })).toBeVisible();

    // Mis vacaciones: solicitar y cancelar
    await barra.getByRole('link', { name: 'Vacaciones' }).click();
    await expect(page.getByRole('heading', { name: 'Solicitar vacaciones' })).toBeVisible();
    await page.getByLabel('Desde').fill('2027-08-02');
    await page.getByLabel('Hasta').fill('2027-08-11');
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await esperarToast(page, 'Solicitud enviada');
    await expect(page.getByText('Solicitada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Cancelar la solicitud/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar solicitud' }).click();
    await esperarToast(page, 'Solicitud cancelada.');
    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();

    // Mi asistencia: el día de hoy ya figura
    await barra.getByRole('link', { name: 'Asistencia' }).click();
    await expect(page).toHaveURL(/\/portal\/asistencia$/);
    await expect(page.getByRole('heading', { name: 'Mi asistencia' })).toBeVisible();
  });

  test('valida las fechas de un permiso antes de enviarlo', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request);
    await iniciarSesion(page, 'empleado', { email: empleado.email, password: empleado.password });
    await page.goto('/portal/permisos');
    await page.getByLabel('Desde').fill('2027-07-20');
    await page.getByLabel('Hasta').fill('2027-07-10');
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByRole('alert')).toContainText('no puede ser anterior');
  });

  test('descarga una boleta en PDF y la pantalla no se desborda en el celular', async ({
    page,
  }) => {
    await iniciarSesion(page, 'empleado');
    await page
      .getByRole('navigation', { name: 'Navegación del portal' })
      .getByRole('link', { name: 'Boletas' })
      .click();
    await expect(page.getByRole('heading', { name: 'Mis boletas' })).toBeVisible();

    const descarga = page.waitForEvent('download');
    await page
      .getByRole('button', { name: /Descargar la boleta de/ })
      .first()
      .click();
    expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);

    // ninguna pantalla del portal provoca scroll horizontal
    for (const ruta of [
      '/portal',
      '/portal/asistencia',
      '/portal/vacaciones',
      '/portal/permisos',
      '/portal/boletas',
    ]) {
      await page.goto(ruta);
      await expect(page.getByRole('navigation', { name: 'Navegación del portal' })).toBeVisible();
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda, `scroll horizontal en ${ruta}`).toBe(false);
    }
  });
});
