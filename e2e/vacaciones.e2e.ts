import { expect, test } from '@playwright/test';
import {
  API,
  EmpleadoDePrueba,
  crearEmpleadoConUsuario,
  esperarToast,
  iniciarSesion,
  tokenApi,
} from './utils';

/** El empleado (por API) pide diez días de vacaciones, como lo haría desde el portal. */
async function solicitar(
  request: Parameters<typeof tokenApi>[0],
  empleado: EmpleadoDePrueba,
  desde: string,
  hasta: string,
): Promise<string> {
  const token = await tokenApi(request, empleado.email, empleado.password);
  const r = await request.post(`${API}/vacaciones/solicitudes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { desde, hasta },
  });
  expect(r.ok(), 'solicitar vacaciones').toBeTruthy();
  return ((await r.json()) as { id: string }).id;
}

test.describe('Vacaciones y permisos (RRHH)', () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, 'rrhh');
  });

  test('aprueba una solicitud: primero como jefe (el empleado no tiene jefe) y luego la final de RRHH', async ({
    page,
    request,
  }) => {
    const empleado = await crearEmpleadoConUsuario(request, { ingreso: '2024-01-08' });
    await solicitar(request, empleado, '2027-04-05', '2027-04-14');

    await page.goto('/panel/vacaciones/bandeja');
    const nombre = new RegExp(empleado.apellidos);
    await expect(page.getByRole('row', { name: nombre })).toContainText('Solicitada');

    await page
      .getByRole('button', { name: new RegExp(`Aprobar como jefe a .*${empleado.apellidos}`) })
      .click();
    await esperarToast(page, 'Falta la aprobación de RRHH');
    await expect(page.getByRole('row', { name: nombre })).toContainText('Aprobada por jefe');

    await page
      .getByRole('button', { name: new RegExp(`Dar aprobación final a .*${empleado.apellidos}`) })
      .click();
    await esperarToast(page, 'Vacaciones aprobadas.');
    await expect(page.getByRole('row', { name: nombre })).toHaveCount(0); // ya no está por aprobar

    // el empleado la ve aprobada
    const token = await tokenApi(request, empleado.email, empleado.password);
    const lista = await request.get(`${API}/vacaciones/solicitudes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(((await lista.json()) as { estado: string }[])[0].estado).toBe('APROBADA_RRHH');
  });

  test('rechaza una solicitud pidiendo el motivo', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request, { ingreso: '2024-01-08' });
    await solicitar(request, empleado, '2027-05-03', '2027-05-12');

    await page.goto('/panel/vacaciones/bandeja');
    await page
      .getByRole('button', { name: new RegExp(`Rechazar vacaciones de .*${empleado.apellidos}`) })
      .click();

    // sin motivo no se puede rechazar
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('button', { name: 'Rechazar' }).click();
    await expect(dialogo.getByText('Este campo es obligatorio.')).toBeVisible();

    await dialogo.getByLabel('Motivo del rechazo').fill('Coincide con el cierre contable');
    await dialogo.getByRole('button', { name: 'Rechazar' }).click();
    await esperarToast(page, 'Solicitud rechazada.');

    const token = await tokenApi(request, empleado.email, empleado.password);
    const lista = await request.get(`${API}/vacaciones/solicitudes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const [solicitud] = (await lista.json()) as { estado: string; motivoRechazo: string }[];
    expect(solicitud.estado).toBe('RECHAZADA');
    expect(solicitud.motivoRechazo).toBe('Coincide con el cierre contable');
  });

  test('aprueba y rechaza permisos', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request);
    const token = await tokenApi(request, empleado.email, empleado.password);
    const pedir = (desde: string) =>
      request.post(`${API}/permisos`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'PERSONAL', desde, hasta: desde, conGoce: true, motivo: 'Trámite E2E' },
      });
    expect((await pedir('2027-06-07')).ok()).toBeTruthy();
    expect((await pedir('2027-06-08')).ok()).toBeTruthy();

    await page.goto('/panel/vacaciones/bandeja');
    const seccion = page.locator('section', { hasText: 'Permisos por aprobar' });
    await page
      .getByRole('button', { name: new RegExp(`Aprobar permiso de .*${empleado.apellidos}`) })
      .first()
      .click();
    await esperarToast(page, 'Permiso aprobado.');

    await page
      .getByRole('button', { name: new RegExp(`Rechazar permiso de .*${empleado.apellidos}`) })
      .first()
      .click();
    await page.getByRole('dialog').getByLabel('Motivo del rechazo').fill('Sin cobertura esa fecha');
    await page.getByRole('dialog').getByRole('button', { name: 'Rechazar' }).click();
    await esperarToast(page, 'Permiso rechazado.');
    await expect(seccion.getByRole('row', { name: new RegExp(empleado.apellidos) })).toHaveCount(0);
  });

  test('los saldos permiten filtrar los periodos vencidos', async ({ page }) => {
    await page.goto('/panel/vacaciones/saldos');
    await expect(page.getByRole('region', { name: 'Saldos de vacaciones' })).toBeVisible();
    await page.getByRole('switch', { name: /solo periodos vencidos/ }).click();
    for (const fila of await page.getByRole('row').all()) {
      const texto = (await fila.textContent()) ?? '';
      if (!texto.includes('Trabajador')) expect(texto).toContain('Vencido');
    }
  });
});
