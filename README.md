# planilla360-web

Interfaz web de **Planilla360**, el SaaS de RRHH y planillas de Nexo Software S.A.C.

## Requisitos
- Node.js `^22.22.3` o `^24.15.0` (con nvm: `nvm use 24.15.0`)
- La API (`planilla360-api`) corriendo en `http://localhost:8080` para las pantallas con datos

## Cómo correrlo
```bash
npm ci
npm start
```
Abre http://localhost:4200

## Cómo verificarlo
```bash
npm run lint
npm run format:check
npm test -- --watch=false
npm run build
```

## Pruebas end-to-end (Playwright)
Recorren los flujos principales de cada rol contra la **API real** (no se ejecutan en el CI).

Requisitos: la API en perfil `local` con la infraestructura de compose (`docker compose --profile messaging --profile storage up -d`, para las boletas), el front en http://localhost:4200 y Chrome instalado.
```bash
npm run e2e                       # todos los flujos
npx playwright test auth          # un archivo
npm run e2e:informe               # informe HTML de la última corrida
```
- Para usar el Chromium de Playwright en vez de Chrome: `npx playwright install chromium` y `E2E_CANAL= npm run e2e` (variable vacía).
- Variables opcionales: `E2E_URL` (front), `E2E_API` (API) y `E2E_PASSWORD` (contraseña de los usuarios de desarrollo, ver el README del api).
- Cada prueba crea sus propios datos (empleados, áreas, horarios, usuarios) con nombres únicos; no hace falta limpiar entre corridas. El cierre de planilla anula y vuelve a crear la del mes si ya estaba cerrada.
- La API limita el login a 5 por minuto y por correo: las pruebas inician sesión por la pantalla una vez por usuario y luego retoman esa sesión.
- `e2e/fixtures/plantilla-empleados-ejemplo.xlsx` es la plantilla de importación con dos filas de ejemplo.

Más información: [CONTRIBUTING.md](CONTRIBUTING.md) y [CLAUDE.md](CLAUDE.md).
