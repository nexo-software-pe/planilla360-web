## Qué cambia
<!-- Resumen breve del cambio -->

Cierra #

## Cómo se probó
<!-- Pruebas agregadas o ejecutadas, pasos manuales -->

## Definition of Done
Detalle en [CONTRIBUTING.md](https://github.com/nexo-software-pe/planilla360-web/blob/staging/CONTRIBUTING.md#definition-of-done).

- [ ] `npm run lint` y `npm run format:check` en verde
- [ ] Pruebas escritas y `npm test -- --watch=false` en verde (o se explica por qué no)
- [ ] E2E agregado o actualizado si toca un flujo de usuario
- [ ] `npm run build` en verde
- [ ] Accesibilidad básica (label por campo, botones reales, `aria-label` en solo-ícono, contraste AA)
- [ ] Tokens de diseño y `SolesPipe` para montos
- [ ] Estados vacío, carga y error con `<app-estado-lista>`
- [ ] CI verde: Build y tests y Escaneo de secretos (los demás checks son informativos)
- [ ] Documentación y `CLAUDE.md` actualizados si cambia el mapa del proyecto
- [ ] Sin secretos ni datos reales; commits con Conventional Commits
