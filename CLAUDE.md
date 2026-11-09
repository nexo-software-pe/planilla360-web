# CLAUDE.md — planilla360-web

Frontend de **Planilla360** (Nexo Software S.A.C.): SPA de RRHH y planillas para pymes peruanas.

## Stack
Angular 22 (standalone components, signals, RxJS, formularios reactivos) · SCSS · Vitest · ESLint (angular-eslint) · Prettier.
Node `^22.22.3 || ^24.15.0` (ver `engines`). Angular Material (+CDK) para controles, tematizado con nuestros tokens (ADR 0001) · Testing Library (`@testing-library/angular`) sobre Vitest. Pendiente: NgRx SignalStore (planilla, Fase 8) y Playwright.

## Comandos
```
npm ci               # instalar dependencias
npm start            # ng serve en http://localhost:4200
npm run lint
npm run format:check # npm run format para corregir
npm test -- --watch=false
npm run build
```

## Convenciones
- Textos de interfaz en español. Dominio en español (Empleado, Planilla); código técnico en inglés.
- Estilos: usar siempre las variables de `src/styles/_tokens.scss` (colores, tipografías, radios); no colores sueltos.
- Montos: un pipe propio de soles (`S/ 3 022,80`); nunca formatear a mano en plantillas.
- Accesibilidad: `<label>` en cada campo, botones reales, `aria-label` en botones solo-ícono, contraste AA.
- Lazy loading por feature (`loadComponent`/`loadChildren`); contenedor/presentación; guards por rol (`authGuard`, `rolGuard(...)`).
- Pruebas: Testing Library (`render`, `screen`, consultas por rol/etiqueta; no por clases CSS). Utilidades de prueba en `*.testing.ts` (fuera del build).
- HTTP: nunca `HttpClient` con URL a mano; usar `API_URL`. Los errores llegan como `ApiError`; una petición que maneja su error en pantalla usa el contexto `OMITIR_TOAST`.
- Commits: Conventional Commits. Ramas `feat/<n>-...`, `fix/<n>-...`, PR a `staging`.
- **Ningún secreto en el repo**.

## Dónde vive qué
- `src/app/app.config.ts` — proveedores (router, HttpClient con interceptores, restauración de sesión al arrancar); `app.routes.ts` — rutas lazy y guards.
- `src/app/core/auth/` — `AuthService` (sesión con signals, refresh de vuelo único), `authInterceptor`, `guards.ts`, `auth.models.ts` (`Rol`, `rutaInicialPara`).
- `src/app/core/http/` — `ApiError`, `errorInterceptor` (toast global), `cargaInterceptor` + `CargaService` (barra de progreso), `NotificacionService`.
- `src/app/core/config/api-url.ts` y `src/environments/` — URL de la API por entorno.
- `src/app/layout/` — `admin/` (menú lateral oscuro + tarjeta de empresa) y `portal/` (móvil, barra inferior); `navegacion.ts` define el menú por rol: cada feature nueva agrega su entrada ahí.
- `src/app/features/` — una carpeta por feature (`login`, `panel`, `portal`, `errores`).
- `src/app/shared/` — `SolesPipe`, `EncabezadoPagina`.
- `src/styles/_tokens.scss` — tokens de diseño; `src/styles.scss` — tema de Material mapeado a los tokens y utilidades globales (`.tabla-caja`, `.cifra`).
- `docs/adr/` — decisiones de arquitectura del front.
- `eslint.config.js`, `.prettierrc` — calidad de código; `.github/workflows/ci.yml` — CI.

## Probar contra la API local
API en perfil `local` (puerto 8080, CORS permite `http://localhost:4200`) y `npm start`. Usuarios de desarrollo: ver el README del api.

## Estado
Fase 7: base lista (layout, login, sesión con refresh, guards, errores/carga globales). Las pantallas de negocio son la Fase 8.
