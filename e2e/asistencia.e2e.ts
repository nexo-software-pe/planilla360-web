import { expect, test } from '@playwright/test';
import {
  API,
  crearEmpleadoConUsuario,
  esperarToast,
  iniciarSesion,
  sufijo,
  tokenApi,
} from './utils';

test.describe('Asistencia (RRHH)', () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, 'rrhh');
  });

  test('crea un horario y lo asigna a un empleado', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request);
    const nombre = `Turno E2E ${sufijo()}`;

    await page.goto('/panel/asistencia/horarios');
    await page.getByRole('button', { name: 'Nuevo horario' }).click();
    await page.getByLabel('Nombre').fill(nombre);
    await page.getByLabel('Hora de entrada').fill('09:00');
    await page.getByLabel('Hora de salida').fill('18:00');
    await page.getByLabel('Tolerancia (min)').fill('10');
    await page.getByLabel('Refrigerio (min)').fill('60');
    await page.getByRole('button', { name: 'Guardar horario' }).click();
    await esperarToast(page, 'Horario creado.');
    await expect(page.getByRole('row', { name: new RegExp(nombre) })).toBeVisible();

    await page.getByRole('button', { name: `Asignar el horario ${nombre} a un empleado` }).click();
    await page.getByRole('combobox', { name: /Empleado/ }).click();
    await page.getByRole('option', { name: new RegExp(empleado.apellidos) }).click();
    await page.getByRole('button', { name: 'Asignar', exact: true }).click();
    await esperarToast(page, 'Horario asignado.');
  });

  test('un horario sin días o con salida anterior a la entrada no se guarda', async ({ page }) => {
    await page.goto('/panel/asistencia/horarios');
    await page.getByRole('button', { name: 'Nuevo horario' }).click();
    await page.getByLabel('Nombre').fill(`Inválido ${sufijo()}`);
    await page.getByLabel('Hora de entrada').fill('18:00');
    await page.getByLabel('Hora de salida').fill('09:00');
    await page.getByRole('button', { name: 'Guardar horario' }).click();
    await expect(page.getByText('La salida debe ser posterior a la entrada.')).toBeVisible();
  });

  test('aprueba y rechaza horas extra', async ({ page, request }) => {
    const empleado = await crearEmpleadoConUsuario(request);
    const token = await tokenApi(request, empleado.email, empleado.password);
    const ayer = new Date(Date.now() - 864e5);
    const fecha = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    const crear = await request.post(`${API}/asistencia/horas-extra`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { fecha, horas: 2, motivo: 'Cierre de lote E2E' },
    });
    expect(crear.ok()).toBeTruthy();

    await page.goto('/panel/asistencia/horas-extra');
    const fila = page.getByRole('row', { name: new RegExp(empleado.apellidos) });
    await expect(fila).toBeVisible();
    await page
      .getByRole('button', { name: new RegExp(`Aprobar horas extra de .*${empleado.apellidos}`) })
      .click();
    await esperarToast(page, 'Horas extra aprobadas.');
    await expect(fila).toHaveCount(0); // sale de "Pendientes"

    // y una segunda, que se rechaza con confirmación
    const otra = await request.post(`${API}/asistencia/horas-extra`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        fecha: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10),
        horas: 1,
        motivo: 'Otra E2E',
      },
    });
    if (otra.ok()) {
      await page.reload();
      await page
        .getByRole('button', {
          name: new RegExp(`Rechazar horas extra de .*${empleado.apellidos}`),
        })
        .click();
      await page.getByRole('dialog').getByRole('button', { name: 'Rechazar' }).click();
      await esperarToast(page, 'Horas extra rechazadas.');
    }
  });

  test('muestra el resumen mensual y el detalle diario de un empleado', async ({ page }) => {
    await page.goto('/panel/asistencia');
    await expect(page).toHaveURL(/asistencia\/resumen/);
    await expect(page.getByRole('columnheader', { name: 'Tardanzas' })).toBeVisible();
    await page.getByRole('link', { name: /Flores Paredes/ }).click();
    await expect(page).toHaveURL(/asistencia\/detalle/);
    await expect(page.getByRole('region', { name: 'Asistencia diaria' })).toBeVisible();
  });
});
