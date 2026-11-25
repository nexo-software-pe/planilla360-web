# CLAUDE.md — planilla360-web

Frontend de **Planilla360** (Nexo Software S.A.C.): SPA de RRHH y planillas para pymes peruanas.

## Stack
Angular 22 (standalone components, signals, RxJS, formularios reactivos) · SCSS · Vitest · ESLint (angular-eslint) · Prettier.
Node `^22.22.3 || ^24.15.0 || >=26.0.0` (ver `engines`). Angular Material (+CDK) para controles, tematizado con nuestros tokens (ADR 0001) · Testing Library (`@testing-library/angular`) sobre Vitest. NgRx SignalStore solo en la planilla (ADR 0002) · Playwright para los E2E.

## Comandos
```
npm ci               # instalar dependencias
npm start            # ng serve en http://localhost:4200
npm run lint
npm run format:check # npm run format para corregir (cubre src, e2e, playwright.config.ts y vitest-base.config.mts)
npm test -- --watch=false
npm test -- --watch=false --include src/app/features/vacaciones/bandeja.spec.ts  # un solo spec
npm run build
npm run e2e              # Playwright contra la API real (ver README)
```
La API limita el login (30 por IP y 5 por correo por minuto): la suite E2E entra desde una sola IP, así que no se suben timeouts ni se cambian esos valores. En el CI el api efímero los relaja con `APP_SECURITY_RATE_LIMIT_IP_POR_MINUTO` y `APP_SECURITY_RATE_LIMIT_LOGIN_POR_MINUTO` (ver README y ADR 0003).

## Convenciones
- Textos de interfaz en español. Dominio en español (Empleado, Planilla); código técnico en inglés.
- Estilos: usar siempre las variables de `src/styles/_tokens.scss` (colores, tipografías, radios); no colores sueltos.
- Montos: un pipe propio de soles (`S/ 3 022,80`); nunca formatear a mano en plantillas.
- Accesibilidad: `<label>` en cada campo, botones reales, `aria-label` en botones solo-ícono, contraste AA.
- Lazy loading por feature (`loadComponent`/`loadChildren`); contenedor/presentación; guards por rol (`authGuard`, `rolGuard(...)`).
- Pantallas de datos: servicio por feature (HTTP) + componente que usa `recurso()` y `<app-estado-lista>`; tablas con `class="tabla"` dentro de `.tabla-caja`, estados con `<app-etiqueta>`, fechas con `fecha`, montos con `soles`. Errores 400 con `errores[]` se pintan en el campo (`setErrors({ servidor })`).
- Menú por rol: `layout/navegacion.ts`; cada ruta de `panel` lleva su `rolGuard`. Los roles de personal (`ROLES_PERSONAL`) son RRHH y ADMIN_EMPRESA.
- Pruebas: Testing Library (`render`, `screen`, consultas por rol/etiqueta; no por clases CSS). Utilidades de prueba en `*.testing.ts` (fuera del build).
- Pruebas de servicios HTTP: `probarPeticiones` y `montarServicio` de `shared/servicio.testing.ts` (tabla de casos con método, URL y cuerpo; `montarServicio` devuelve servicio y `HttpTestingController`). Dobles de `DialogosService` y `NotificacionService` y `proveedoresTransversales`: `shared/pruebas.testing.ts`. Credenciales ficticias de baja entropía (`'x'`); Gitleaks revisa todo el historial.
- HTTP: nunca `HttpClient` con URL a mano; usar `API_URL`. Los errores llegan como `ApiError`; una petición que maneja su error en pantalla usa el contexto `OMITIR_TOAST`.
- Commits: Conventional Commits. Ramas `feat/<n>-...`, `fix/<n>-...`, `docs/...`, PR a `staging`. Flujo y Definition of Done en `CONTRIBUTING.md`.
- CI (`.github/workflows/ci.yml`): obligatorios `Build y tests` y `Escaneo de secretos` (Gitleaks); informativos SonarCloud, Dependencias (Trivy), E2E (Playwright) y CodeQL (`codeql.yml`).
- **Ningún secreto en el repo**.

## Dónde vive qué
- `src/app/app.config.ts` — proveedores (router, HttpClient con interceptores, restauración de sesión al arrancar); `app.routes.ts` — rutas lazy y guards.
- `src/app/core/auth/` — `AuthService` (sesión con signals, refresh de vuelo único), `authInterceptor`, `guards.ts`, `auth.models.ts` (`Rol`, `rutaInicialPara`).
- `src/app/core/http/` — `ApiError`, `errorInterceptor` (toast global), `cargaInterceptor` + `CargaService` (barra de progreso), `NotificacionService`.
- `src/app/core/config/api-url.ts` y `src/environments/` — URL de la API por entorno.
- `src/app/layout/` — `admin/` (menú lateral oscuro + tarjeta de empresa) y `portal/` (móvil, barra inferior); `navegacion.ts` define el menú por rol: cada feature nueva agrega su entrada ahí.
- `src/app/features/` — una carpeta por feature: `login`, `errores`, `portal` (inicio, asistencia, vacaciones, permisos y boletas del empleado), `planilla` (lista, detalle con `PlanillaStore`, gratificación y CTS, reportes), `panel` (inicio: `panel-rrhh` y `panel-saas`), `empleados` (lista, ficha con pestañas, formulario, importación), `asistencia` (shell con pestañas: resumen, detalle, horas extra, horarios), `vacaciones` (shell: bandeja y saldos), `admin` (usuarios, áreas y cargos, auditoría; `admin.service` también sirve a `saas`), `saas` (empresas, parámetros legales), `catalogo` (áreas, cargos y AFP en memoria).
- `src/app/shared/` — `PaginadorEs` (paginador en español, se provee en los layouts), `descarga.ts`, `SolesPipe`, `FechaPipe`, `EncabezadoPagina`, `Etiqueta` + `estados.ts` (estado → texto y tono), `EstadoLista` (cargando / error / vacío), `recurso()` (carga con signals), `DialogosService` (confirmar y pedir texto), `validadores.ts` (DNI, RUC, teléfono, contraseña), `fechas.ts` (siempre hora local).
- `src/styles/_tokens.scss` — tokens de diseño; `src/styles.scss` — tema de Material mapeado a los tokens y utilidades globales (`.tabla-caja`, `.cifra`).
- `e2e/` — pruebas Playwright (`*.e2e.ts`, fuera de `src` y de Vitest); `utils.ts` tiene el login por rol, los tokens por API y `crearEmpleadoConUsuario`.
- `docs/adr/` — decisiones de arquitectura del front (índice en `docs/adr/README.md`, ADR 0001 a 0007).
- `README.md` (puesta en marcha, scripts, E2E, mapa de documentación), `CONTRIBUTING.md` (flujo de ramas y PR, convenciones, CI y checks, Definition of Done).
- `docs/ONBOARDING.md` — guía del primer día, recorrido del código y problemas frecuentes.
- `vitest-base.config.mts` — límites de Vitest (timeouts y workers) que usa `npm test`; `eslint.config.js`, `.prettierrc` — calidad de código; `.github/workflows/ci.yml` y `codeql.yml` — CI y análisis de código.

## Probar contra la API local
API en perfil `local` (puerto 8080, CORS permite `http://localhost:4200`) y `npm start`. Usuarios de desarrollo: ver el README del api.

## Estado
Fases 7 a 10 completas: base de la app y sesión (7); pantallas de RRHH, ADMIN_EMPRESA y ADMIN_SAAS (8a); planilla con SignalStore, gratificación y CTS, boletas y reportes, portal del empleado y E2E (8b); CI con Build y tests, escaneo de secretos, SonarCloud, Trivy, E2E y CodeQL (9); documentación del repo: README, CONTRIBUTING, ONBOARDING y ADR 0001 a 0007 (10). El despliegue se hace aparte.
