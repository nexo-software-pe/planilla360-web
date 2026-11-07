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

Más información: [CONTRIBUTING.md](CONTRIBUTING.md) y [CLAUDE.md](CLAUDE.md).
