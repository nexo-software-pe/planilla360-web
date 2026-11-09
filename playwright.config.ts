import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la API real. Requisitos: API en perfil `local` (puerto 8080, con la infraestructura
 * `messaging` y `storage` de compose para boletas) y el front en http://localhost:4200 (`npm start`).
 * Por defecto usa el Chrome instalado (`E2E_CANAL=chrome`); con `E2E_CANAL=` vacío usa el Chromium
 * de Playwright (`npx playwright install chromium`).
 */
const canal = process.env['E2E_CANAL'] ?? 'chrome';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  // las pruebas comparten una sola base de datos: se ejecutan de a una
  workers: 1,
  fullyParallel: false,
  // en el CI un reintento absorbe los fallos espurios (la traza queda en el informe)
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI']
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['E2E_URL'] ?? 'http://localhost:4200',
    channel: canal || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    acceptDownloads: true,
  },
  projects: [
    {
      name: 'escritorio',
      testIgnore: '**/portal.e2e.ts',
      use: { ...devices['Desktop Chrome'], channel: canal || undefined },
    },
    // el portal del empleado es mobile-first: se prueba en un viewport de celular
    {
      name: 'movil',
      testMatch: '**/portal.e2e.ts',
      use: { ...devices['Pixel 7'], channel: canal || undefined },
    },
  ],
});
