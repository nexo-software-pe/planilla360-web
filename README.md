# planilla360-web

Interfaz web de **Planilla360**, el SaaS multi-empresa de RRHH y planillas de Nexo Software S.A.C. para pymes peruanas. Es una SPA con el panel de administración (empleados, asistencia, vacaciones, planillas, boletas, catálogos), el portal del empleado (pensado para celular) y la consola de la plataforma.

## Stack
Angular 22 (componentes standalone, signals) · Angular Material · NgRx Signals (SignalStore) · RxJS · TypeScript. Pruebas unitarias con Vitest y Testing Library; E2E con Playwright. Detalle y convenciones en [CLAUDE.md](CLAUDE.md).

## Requisitos
- **Git**.
- **Node.js 24.15.0**. Los `engines` de `package.json` aceptan `^22.22.3`, `^24.15.0` o `>=26.0.0`; el proyecto y el CI usan 24.15.0. En Windows se instala con [nvm-windows](https://github.com/coreybutler/nvm-windows):
  ```bash
  nvm install 24.15.0
  nvm use 24.15.0
  node -v    # debe decir v24.15.0
  ```
- **Angular CLI global: no hace falta.** `npm start` y los demás scripts usan el CLI que queda en `node_modules`.
- La **API local** (ver abajo) y **Docker Desktop** encendido para levantarla.

## Puesta en marcha
1. **Levanta la API local.** El front es solo la interfaz: sin la API no hay login ni datos. Clona [planilla360-api](https://github.com/nexo-software-pe/planilla360-api) y sigue su README (secciones «Requisitos» e «Inicio rápido»; no se repite aquí). Cuando esté lista responde en http://localhost:8080/actuator/health. Para las boletas y los correos hace falta la infraestructura de compose completa (`docker compose --profile full up -d` en el repo de la API).
2. **Instala las dependencias y arranca el front:**
   ```bash
   git clone https://github.com/nexo-software-pe/planilla360-web.git
   cd planilla360-web
   npm ci
   npm start
   ```
3. Abre http://localhost:4200 e inicia sesión con un usuario de desarrollo.

### Usuarios de desarrollo (solo entorno local)
Los usuarios y la contraseña común de desarrollo (admin de plataforma, admin de empresa, RRHH y empleado) están en la sección «Usuarios de desarrollo» del [README de la API](https://github.com/nexo-software-pe/planilla360-api/blob/staging/README.md#usuarios-de-desarrollo-solo-perfil-local). Existen únicamente con el perfil `local` de la API y datos ficticios. Cada rol aterriza en su pantalla: RRHH y admin en el panel, el empleado en el portal, el admin de plataforma en el panel (`/panel`), con la vista de plataforma.

## URL de la API
El front obtiene la URL base del token `API_URL` (`src/app/core/config/api-url.ts`), que toma el valor de `src/environments/`:

| Archivo | Cuándo se usa | `apiUrl` |
|---|---|---|
| `environment.ts` | `npm start`, `npm test` (desarrollo) | `http://localhost:8080/api/v1` |
| `environment.production.ts` | `npm run build` (reemplazo de archivo del build de producción) | `/api/v1` (relativa) |

Para apuntar a otra API en desarrollo, cambia `apiUrl` en `environment.ts` (no lo subas al repo). Las pruebas unitarias reemplazan el token `API_URL` con un valor propio. La API debe permitir el origen http://localhost:4200 por CORS (el perfil `local` ya lo hace).

## Scripts
> Los comandos de este README usan sintaxis de Git Bash. En Windows PowerShell o pwsh las variables de entorno se asignan antes: `$env:E2E_CANAL="chromium"; npm run e2e`. Ojo: en PowerShell asignar una cadena vacía (`$env:E2E_CANAL=""`) elimina la variable, y entonces se usaría el Chrome instalado; por eso aquí se pide el canal `chromium` explícitamente. Para volver al Chrome: `Remove-Item Env:E2E_CANAL`.

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200 con recarga (`ng serve`) |
| `npm run lint` | ESLint (angular-eslint) sobre el proyecto (`ng lint`) |
| `npm run format` | Da formato con Prettier a `src`, `e2e`, `playwright.config.ts` y `vitest-base.config.mts` |
| `npm run format:check` | Comprueba el formato sin modificar nada (lo exige el CI) |
| `npm test -- --watch=false` | Pruebas unitarias con Vitest, una sola pasada (`ng test`); sin `--watch=false` queda en modo vigilancia |
| `npm test -- --watch=false --coverage` | Igual, con cobertura (informe en `coverage/`) |
| `npm run build` | Build de producción en `dist/` |
| `npm run watch` | Build de desarrollo que se recompila al cambiar archivos |
| `npm run e2e` | Pruebas end-to-end de Playwright (ver abajo) |
| `npm run e2e:informe` | Abre el informe HTML de la última corrida E2E |

Antes de abrir un PR deben pasar `lint`, `format:check`, `test` y `build`.

## Pruebas end-to-end (Playwright)
Recorren los flujos principales de cada rol contra la **API real**, sin simulaciones. Los archivos están en `e2e/` (`*.e2e.ts`) y la configuración en `playwright.config.ts`.

Requisitos:
1. La API en perfil `local` corriendo en http://localhost:8080 con la infraestructura completa de compose (`docker compose --profile full up -d` en el repo de la API; las boletas necesitan RabbitMQ y MinIO).
2. El front sirviéndose en http://localhost:4200 (`npm start`).
3. Un navegador. Por defecto usa el Chrome instalado; para usar el Chromium de Playwright:
   ```bash
   npx playwright install chromium
   E2E_CANAL= npm run e2e        # variable vacía = Chromium de Playwright
   ```

```bash
npm run e2e                       # todos los flujos
npx playwright test auth          # un archivo
npm run e2e:informe               # informe HTML de la última corrida
```
- Variables opcionales: `E2E_URL` (front), `E2E_API` (API) y `E2E_PASSWORD` (contraseña de los usuarios de desarrollo, ver el README de la API).
- Cada prueba crea sus propios datos con nombres únicos; no hace falta limpiar entre corridas. Las pruebas corren de a una (un solo worker) porque comparten la base.
- `e2e/fixtures/plantilla-empleados-ejemplo.xlsx` es la plantilla de importación con dos filas de ejemplo.

### Límite de intentos de login
La API limita el login (por defecto 30 por IP y 5 por correo desde la misma IP, por minuto). La suite entra siempre desde la misma IP, por lo que en un equipo rápido puede ver «Superaste el límite de intentos». Las pruebas ya inician sesión por la pantalla una sola vez por usuario y luego retoman esa sesión. Si aun así lo encuentras, espera un minuto y repite; no subas timeouts ni cambies los valores por defecto de la API.

En el CI (job «E2E (Playwright)» de `.github/workflows/ci.yml`) la API es efímera: se compila la rama `staging` del repo de la API, se arranca con el perfil `local` junto a PostgreSQL, RabbitMQ, MinIO, Mailpit y WireMock, y se relajan los límites solo en ese proceso con las variables `APP_SECURITY_RATE_LIMIT_IP_POR_MINUTO` y `APP_SECURITY_RATE_LIMIT_LOGIN_POR_MINUTO`. Ese job informa pero no bloquea el merge. Más contexto en [docs/adr/0003-e2e-en-el-ci.md](docs/adr/0003-e2e-en-el-ci.md).

## Estructura
```
src/
  app/
    core/        sesión, interceptor HTTP, guards, configuración (API_URL)
    shared/      componentes, pipes y utilidades reutilizables
    layout/      cascarones del panel de administración y del portal
    features/    una carpeta por funcionalidad (login, panel, empleados, asistencia,
                 vacaciones, planilla, portal, catalogo, admin, saas, errores)
  environments/  URL de la API por entorno
e2e/             pruebas Playwright y sus fixtures
docs/adr/        decisiones de arquitectura
.github/         CI, plantillas de issues y PR, Dependabot
```

## Definition of Done
El detalle está en [CONTRIBUTING.md](CONTRIBUTING.md#definition-of-done).

## Mapa de documentación
| Documento | Para qué |
|---|---|
| [CLAUDE.md](CLAUDE.md) | convenciones, mapa «dónde vive qué» y estado del proyecto |
| [CONTRIBUTING.md](CONTRIBUTING.md) | flujo de ramas y PR, convenciones y Definition of Done |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | primer día, recorrido del código y problemas frecuentes |
| [docs/adr/](docs/adr/README.md) | decisiones de arquitectura (índice numerado de los ADR 0001 a 0007) |
| [README de la API](https://github.com/nexo-software-pe/planilla360-api/blob/staging/README.md) | cómo levantar el backend y usuarios de desarrollo |
