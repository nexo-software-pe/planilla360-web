import { expect, test } from '@playwright/test';
import { esperarToast, iniciarSesion, sufijo } from './utils';

test.describe('ADMIN_EMPRESA', () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, 'admin');
  });

  test('crea un área, la ve en la lista y la elimina', async ({ page }) => {
    const nombre = `Área E2E ${sufijo()}`;
    await page.goto('/panel/areas-cargos');
    await page.getByRole('button', { name: 'Nueva área' }).click();

    // vacío no se guarda
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await expect(page.getByText('Este campo es obligatorio.')).toBeVisible();

    await page.getByLabel('Nombre del área').fill(nombre);
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await esperarToast(page, 'Área creada.');
    await expect(page.getByRole('row', { name: new RegExp(nombre) })).toBeVisible();

    await page.getByRole('button', { name: `Eliminar el área ${nombre}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await esperarToast(page, 'Área eliminada.');
    await expect(page.getByRole('row', { name: new RegExp(nombre) })).toHaveCount(0);
  });

  test('crea un usuario de RRHH, valida la contraseña y lo desactiva', async ({ page }) => {
    const s = sufijo();
    const nombre = `Usuario E2E ${s}`;
    await page.goto('/panel/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();

    await page.getByLabel('Nombre').fill(nombre);
    await page
      .getByLabel('Correo electrónico')
      .fill(`e2e.${s.toLowerCase()}@textilesandinos.ejemplo.pe`);
    await page.getByRole('combobox', { name: /Rol/ }).click();
    await page.getByRole('option', { name: 'Recursos Humanos' }).click();

    // una contraseña débil se rechaza en el formulario
    await page.getByLabel('Contraseña inicial').fill('corta');
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(
      page.getByText('Mínimo 10 caracteres, con letras y números.').last(),
    ).toBeVisible();

    await page.getByLabel('Contraseña inicial').fill(`Clave${s}2026x`);
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await esperarToast(page, 'Usuario creado.');
    // la lista está ordenada por nombre y paginada: el usuario nuevo queda en la última página
    await page.getByRole('button', { name: 'Última página' }).click();
    await expect(page.getByRole('row', { name: new RegExp(nombre) })).toContainText(
      'Recursos Humanos',
    );

    await page.getByRole('button', { name: `Desactivar a ${nombre}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click();
    await esperarToast(page, 'Usuario desactivado.');
    await expect(page.getByRole('row', { name: new RegExp(nombre) })).toContainText('Inactivo');
  });

  test('la auditoría muestra los cambios con su antes y después', async ({ page }) => {
    await page.goto('/panel/auditoria');
    await expect(page.getByRole('region', { name: 'Registros de auditoría' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver cambios' }).first().click();
    await expect(page.getByRole('heading', { name: 'Antes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Después' })).toBeVisible();
  });
});

test.describe('ADMIN_SAAS', () => {
  test('ve las empresas cliente y los parámetros legales', async ({ page }) => {
    await iniciarSesion(page, 'saas');
    await expect(page.getByRole('heading', { name: 'Panel de la plataforma' })).toBeVisible();

    await page.getByRole('link', { name: 'Empresas', exact: true }).click();
    await expect(page.getByRole('row', { name: /Textiles Andinos/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Panadería La Espiga/ })).toBeVisible();

    await page.getByRole('link', { name: 'Parámetros legales' }).click();
    await expect(page.getByRole('row', { name: /ESSALUD_PCT/ })).toBeVisible();
  });
});
