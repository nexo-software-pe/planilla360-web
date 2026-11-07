# Guía de contribución

## Flujo de trabajo
1. Toma un issue y muévelo a *In progress* en el tablero.
2. Crea una rama desde `staging`: `fix/23-calculo-cts`, `feat/41-export-excel`.
3. Haz commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/): `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`.
4. Abre un PR hacia `staging` con la plantilla completa y espera la revisión y el CI en verde.
5. Los releases se hacen con un PR `staging` → `main`. Los incidentes de producción usan `hotfix/*` desde `main`.

## Entorno
- Node.js 22.22.3+ o 24.15.0+ (`nvm use 24.15.0`).
- Antes de abrir el PR: `npm run lint`, `npm run format:check`, `npm test -- --watch=false` y `npm run build` deben pasar.

## Convenciones de código
- Dominio en español, infraestructura en inglés.
- Tests nuevos para cada cambio de comportamiento; ante un bug, escribe primero el test que lo reproduce.
- Nunca subas secretos, contraseñas ni datos reales de personas.

## Definition of Done
Tests escritos y en verde · lint/Prettier en verde · PR revisado · documentación actualizada.
