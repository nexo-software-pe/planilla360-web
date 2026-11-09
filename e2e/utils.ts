import { APIRequestContext, Page, expect } from '@playwright/test';

/** Usuarios de desarrollo del seed local (ver el README del api). */
export const API = process.env['E2E_API'] ?? 'http://localhost:8080/api/v1';
const PASSWORD = process.env['E2E_PASSWORD'] ?? 'Planilla360-Local1';

export const USUARIOS = {
  saas: 'admin.saas@nexosoftware.pe',
  admin: 'admin@textilesandinos.ejemplo.pe',
  rrhh: 'rrhh@textilesandinos.ejemplo.pe',
  empleado: 'empleado@textilesandinos.ejemplo.pe',
} as const;

export type RolPrueba = keyof typeof USUARIOS;

const PANTALLA_INICIAL: Record<RolPrueba, RegExp> = {
  saas: /\/panel$/,
  admin: /\/panel$/,
  rrhh: /\/panel$/,
  empleado: /\/portal$/,
};

const CLAVE_REFRESH = 'planilla360.refresh';

/**
 * Último refresh token de cada usuario de prueba. La API limita el login a 5 por minuto y por
 * correo, y rota el refresh token en cada uso: se inicia sesión por la pantalla una sola vez y las
 * demás pruebas retoman esa sesión (como una persona que vuelve a abrir la aplicación).
 */
const sesiones = new Map<string, string>();

function recordarRefresh(page: Page, email: string): void {
  page.on('response', (r) => {
    const url = r.url();
    const esSesion = /\/auth\/(login|refresh)$/.test(url);
    if (r.request().method() !== 'POST' || !esSesion || !r.ok()) return;
    void r
      .json()
      .then((cuerpo: { refreshToken?: string }) => {
        if (cuerpo.refreshToken) sesiones.set(email, cuerpo.refreshToken);
      })
      .catch(() => undefined);
  });
}

async function loginPorPantalla(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

/**
 * Deja la sesión iniciada. Con el usuario de un rol ya usado, retoma su sesión; si no hay (o ya no
 * sirve), inicia sesión por la pantalla de login como lo haría una persona.
 */
export async function iniciarSesion(
  page: Page,
  rol: RolPrueba,
  credenciales?: { email: string; password: string },
): Promise<void> {
  const email = credenciales?.email ?? USUARIOS[rol];
  const password = credenciales?.password ?? PASSWORD;
  recordarRefresh(page, email);

  const guardado = sesiones.get(email);
  if (guardado) {
    await page.addInitScript(
      ([clave, valor]) => {
        if (!localStorage.getItem(clave)) localStorage.setItem(clave, valor);
      },
      [CLAVE_REFRESH, guardado],
    );
    await page.goto(rol === 'empleado' ? '/portal' : '/panel');
    try {
      await expect(page).toHaveURL(PANTALLA_INICIAL[rol], { timeout: 8000 });
      return;
    } catch {
      // el refresh guardado ya no sirve: se entra con la contraseña
      await page.evaluate((clave) => localStorage.removeItem(clave), CLAVE_REFRESH);
    }
  }
  await loginPorPantalla(page, email, password);
  await expect(page).toHaveURL(PANTALLA_INICIAL[rol]);
}

/** Cierra el toast para que no tape botones ni se confunda con el siguiente. */
export async function esperarToast(page: Page, texto: string | RegExp): Promise<void> {
  await expect(
    page.locator('.mdc-snackbar__label').filter({ hasText: texto }).first(),
  ).toBeVisible();
}

const tokensApi = new Map<string, { token: string; hasta: number }>();

/** Access token por API (con caché de 10 min para no agotar el límite de logins). */
export async function tokenApi(
  request: APIRequestContext,
  email: string,
  password: string = PASSWORD,
): Promise<string> {
  const guardado = tokensApi.get(email);
  if (guardado && guardado.hasta > Date.now()) return guardado.token;
  const r = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(r.ok(), `login de ${email}`).toBeTruthy();
  const token = ((await r.json()) as { accessToken: string }).accessToken;
  tokensApi.set(email, { token, hasta: Date.now() + 10 * 60_000 });
  return token;
}

const aleatorio = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

/** DNI de 8 dígitos poco probable de repetir (empieza en 9). */
export const dniUnico = (): string => `9${aleatorio(7)}`;

/** Sufijo corto y único para nombres de áreas, horarios y usuarios creados por las pruebas. */
export const sufijo = (): string => Date.now().toString(36).slice(-5).toUpperCase();

export interface EmpleadoDePrueba {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
}

/**
 * Deja listo un empleado con contrato y usuario (rol EMPLEADO) usando la API: así cada prueba
 * parte de datos propios y no depende del estado que dejaron las demás.
 */
export async function crearEmpleadoConUsuario(
  request: APIRequestContext,
  opciones: { ingreso?: string } = {},
): Promise<EmpleadoDePrueba> {
  const token = await tokenApi(request, USUARIOS.admin);
  const cabeceras = { Authorization: `Bearer ${token}` };
  const get = async <T>(ruta: string): Promise<T> =>
    (await (await request.get(`${API}${ruta}`, { headers: cabeceras })).json()) as T;

  const areas = await get<{ contenido: { id: string }[] }>('/areas?size=1');
  const cargos = await get<{ contenido: { id: string; areaId: string }[] }>('/cargos?size=1');
  const dni = dniUnico();
  const s = sufijo();
  const datos = {
    dni,
    nombres: 'Prueba',
    apellidos: `E2E ${s}`,
    fechaNacimiento: '1994-03-15',
    email: `e2e.${dni}@textilesandinos.ejemplo.pe`,
    telefono: '987654321',
    fechaIngreso: opciones.ingreso ?? '2025-01-06',
    areaId: cargos.contenido[0].areaId ?? areas.contenido[0].id,
    cargoId: cargos.contenido[0].id,
    jefeId: null,
  };
  const empleado = await request.post(`${API}/empleados`, { headers: cabeceras, data: datos });
  expect(empleado.ok(), 'crear empleado').toBeTruthy();
  const { id } = (await empleado.json()) as { id: string };

  const contrato = await request.post(`${API}/empleados/${id}/contratos`, {
    headers: cabeceras,
    data: {
      tipo: 'INDEFINIDO',
      fechaInicio: datos.fechaIngreso,
      sueldoBasico: 1500,
      jornadaSemanal: 48,
      diasLaborables: 5,
      regimenPensionario: 'ONP',
    },
  });
  expect(contrato.ok(), 'crear contrato').toBeTruthy();

  const password = `Prueba${aleatorio(6)}x`;
  const usuario = await request.post(`${API}/usuarios`, {
    headers: cabeceras,
    data: {
      nombre: `Prueba E2E ${s}`,
      email: datos.email,
      password,
      rol: 'EMPLEADO',
      empleadoId: id,
    },
  });
  expect(usuario.ok(), 'crear usuario').toBeTruthy();
  return {
    id,
    dni,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    email: datos.email,
    password,
  };
}
