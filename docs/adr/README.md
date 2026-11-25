# Decisiones de arquitectura (ADR)

Cada ADR registra el contexto, la decisión, las alternativas y las consecuencias de una decisión del front.

1. [0001 — Librería de componentes y manejo de la sesión](0001-componentes-y-sesion.md): Angular Material y el ciclo de vida de los tokens.
2. [0002 — NgRx SignalStore en la planilla y pruebas E2E](0002-signalstore-y-pruebas-e2e.md): store solo donde hace falta y Playwright para los flujos.
3. [0003 — Pruebas E2E en el CI](0003-e2e-en-el-ci.md): los E2E contra la API real en cada PR hacia `staging`.
4. [0004 — Estructura por feature, rutas lazy y guards por rol](0004-estructura-por-feature-y-rutas-lazy.md): carga diferida, `rolGuard` y menú por rol.
5. [0005 — Manejo global de errores y de carga](0005-errores-y-carga-globales.md): `ApiError`, interceptores, toasts y barra de carga.
6. [0006 — Formato de montos y fechas](0006-formato-de-montos-y-fechas.md): `SolesPipe`, `FechaPipe` y fechas en hora local.
7. [0007 — Pruebas unitarias: Testing Library sobre Vitest](0007-pruebas-unitarias.md): consultas por rol, helpers y configuración de timeouts.
