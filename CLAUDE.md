# CLAUDE.md — planilla360-web

Frontend de **Planilla360** (Nexo Software S.A.C.): SPA de RRHH y planillas para pymes peruanas.

## Stack
Angular 22 (standalone components, signals, RxJS, formularios reactivos) · SCSS · Vitest · ESLint (angular-eslint) · Prettier.
Node `^22.22.3 || ^24.15.0` (ver `engines`). Pendiente de decidir: librería de componentes (Material vs PrimeNG), NgRx SignalStore, Playwright.

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
- Lazy loading por feature; contenedor/presentación; guards por rol.
- Commits: Conventional Commits. Ramas `feat/<n>-...`, `fix/<n>-...`, PR a `staging`.
- **Ningún secreto en el repo**.

## Dónde vive qué
- `src/app/` — aplicación (`app.config.ts`, `app.routes.ts`).
- `src/styles/_tokens.scss` — tokens de diseño; `src/styles.scss` — estilos globales.
- `eslint.config.js`, `.prettierrc` — calidad de código.
- `.github/workflows/ci.yml` — CI.

## Estado
Fase 1: esqueleto con CI. Pantallas pendientes.
