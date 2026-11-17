# Guía de contribución

Gracias por aportar a **planilla360-web**. Esta guía explica el flujo de trabajo, las convenciones y la Definition of Done. Cómo instalar y arrancar el proyecto está en el [README](README.md); las convenciones técnicas resumidas, en [CLAUDE.md](CLAUDE.md).

## Flujo de trabajo
1. **Issue.** Toma un issue (usa las plantillas de historia de usuario o reporte de error) y muévelo a *In progress* en el tablero.
2. **Rama** desde `staging` actualizado (`git switch staging && git pull`). Nombre: `<tipo>/<n>-<slug>`, con tipo `feat`, `fix`, `refactor`, `chore`, `docs`, `test` o `ci`. Ejemplos: `feat/41-export-excel`, `fix/23-saldo-vacaciones`, `docs/12-guia-contribucion`.
3. **Commits pequeños** con Conventional Commits (ver abajo).
4. **Pull request a `staging`** con la [plantilla](.github/pull_request_template.md) completa. Un PR = un cambio pequeño y revisable. No hagas push directo a `staging` ni a `main`.
5. **Release:** un PR `staging` → `main`.
6. **Hotfix:** una corrección urgente sale de una rama `hotfix/<slug>` creada desde `main`, con PR a `main`. Después se abre un PR `main` → `staging` para que la corrección no se pierda.

Las ramas `main` y `staging` están protegidas: los cambios entran solo por PR con los checks obligatorios en verde (ver [CI y checks](#ci-y-checks)).

## Conventional Commits
Formato: `tipo(alcance opcional): descripción en español, en imperativo y en minúsculas`.

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | funcionalidad nueva | `feat(vacaciones): agrega la bandeja de solicitudes pendientes` |
| `fix` | corrección de un error | `fix(planilla): corrige el redondeo del neto a pagar` |
| `test` | pruebas | `test(empleados): cubre la validación del DNI` |
| `refactor` | cambio interno sin alterar el comportamiento | `refactor(shared): simplifica recurso()` |
| `docs` | documentación | `docs: actualiza la guía de contribución` |
| `chore` | mantenimiento, dependencias | `chore(deps): actualiza Angular a la última 22.x` |
| `ci` | flujos de CI | `ci: agrega el job de E2E` |

Un cambio incompatible se marca con `!` (`feat(auth)!: ...`) y se explica en el cuerpo.

## Versionado
El proyecto sigue [SemVer](https://semver.org/lang/es/) (`MAYOR.MENOR.PARCHE`): `feat` sube el menor, `fix` el parche y un cambio incompatible el mayor. Un `CHANGELOG.md` generado a partir de los commits convencionales es un proceso futuro; hoy no se mantiene.

## Cómo correr las comprobaciones
Los comandos, sus opciones y los requisitos de las pruebas E2E están en el [README](README.md#scripts) y en [Pruebas end-to-end](README.md#pruebas-end-to-end-playwright). Antes de abrir el PR:

```bash
npm run lint
npm run format:check      # npm run format aplica Prettier
npm test -- --watch=false
npm run build
npm run e2e               # si el cambio toca un flujo de usuario (requiere la API local)
```

## Convenciones de UI
- **Tokens de diseño:** colores, tipografías y radios salen de las variables de [src/styles/_tokens.scss](src/styles/_tokens.scss). No uses colores sueltos.
- **Montos:** siempre con `SolesPipe` (`S/ 3 022,80`); nunca formatees a mano en las plantillas. Las fechas, con `FechaPipe`.
- **Accesibilidad:**
  - un `<label>` por cada campo de formulario;
  - botones reales (`<button>`), no `div` con `click`;
  - `aria-label` en los botones que solo tienen un ícono;
  - contraste de color AA como mínimo.
- **Estados de las pantallas de datos:** cargando, error y vacío se resuelven con `<app-estado-lista>` junto a `recurso()`; no se improvisan en cada pantalla.
- Textos de interfaz en español; dominio en español, código técnico en inglés.

## Convenciones de pruebas
- **Testing Library** (`render`, `screen`): consulta por rol o etiqueta (`getByRole`, `getByLabelText`), no por clases CSS.
- Las utilidades de prueba van en archivos `*.testing.ts` (fuera del build), como `shared/pruebas.testing.ts` (dobles de `DialogosService` y `NotificacionService`).
- Servicios HTTP: `probarPeticiones` de `shared/servicio.testing.ts`, con una tabla de casos (método, URL, cuerpo).
- Ante un error, escribe primero la prueba que lo reproduce.
- **E2E:** si un selector es ambiguo, acota la consulta al contenedor que corresponde (la fila, el diálogo, la tarjeta). No resuelvas la ambigüedad con `.first()` ni `.nth()`: la prueba pasa o falla según el orden de los datos. Cada prueba crea sus propios datos con nombres únicos y debe pasar sobre una base vacía.
- **Credenciales ficticias de baja entropía** en las pruebas (`'x'`, `'aaaaaaaaaa1'`). El escáner de secretos revisa todo el historial y marca las cadenas que parecen claves reales; si una se cuela, no basta con borrarla en un commit posterior.

## CI y checks
El workflow [ci.yml](.github/workflows/ci.yml) corre en cada PR. Según la protección de `staging` y `main`, los checks **obligatorios** son:

| Check | Qué hace |
|---|---|
| **Build y tests** | lint, formato, pruebas con cobertura y build |
| **Escaneo de secretos** | Gitleaks sobre el historial y todas las ramas |

Son **informativos** (no bloquean el merge, pero conviene revisarlos): SonarCloud, Dependencias (Trivy), E2E (Playwright) y CodeQL. Un check informativo en rojo no se ignora: se atiende en el mismo cambio o en un issue.

### SonarCloud y su quality gate
- El gate del PR exige, entre otras condiciones, **cobertura del código nuevo ≥ 80 %** y ningún problema nuevo de fiabilidad o seguridad.
- Si falla, abre «Details» en el check y mira qué condición no se cumple:
  - *cobertura:* cubre todas las líneas y ramas que tocaste; una rama imposible de alcanzar se elimina, no se prueba;
  - *problemas de código:* corrige el hallazgo; no desactives la regla.
- El análisis de la rama `staging` mide el código «nuevo» frente a `main`, así que puede fallar aunque cada PR pase. Revisa el CI del push tras cada merge.

### Dependabot
[Dependabot](.github/dependabot.yml) abre cada lunes PR hacia `staging`: para npm con prefijo `chore(deps)` y para GitHub Actions con prefijo `ci(deps)`. En npm las actualizaciones menores y de parche se agrupan (Angular y NgRx, herramientas de calidad y el resto); las versiones mayores **no** se agrupan y llegan en un PR aparte. Las acciones de GitHub se agrupan en un solo PR. Se revisan como cualquier PR: CI en verde y, en una actualización mayor, lee las notas de versión antes de aprobar. SonarCloud no analiza los PR de Dependabot (el job se omite para ese autor), así que su ausencia en esos PR no es un fallo.

## Revisión de PR
- Quien revisa comprueba el criterio de aceptación, que las pruebas tengan sentido, la Definition of Done y que la plantilla esté completa.
- Los comentarios se resuelven en la misma rama con commits nuevos; evita reescribir el historial publicado.
- Convención del equipo: nadie hace merge de su propio cambio sin revisión previa. GitHub no lo obliga (la protección de las ramas no exige aprobaciones), así que depende de nosotros.

## Seguridad
- **Nunca** subas secretos, contraseñas ni datos reales de personas: ni en el código, ni en pruebas, ni en commits, ni en capturas, ni en issues.
- Los usuarios de desarrollo son ficticios y existen solo en el perfil `local` de la API.
- Decisiones sobre la sesión: [ADR 0001](docs/adr/0001-componentes-y-sesion.md) (el refresh token vive en `localStorage`). En la práctica: no uses `innerHTML` ni otras vías de HTML sin sanear, porque el riesgo asumido es un XSS que lea ese token.

## Definition of Done
Un cambio está terminado cuando cumple todo lo siguiente (la plantilla de PR repite esta lista):

- [ ] `npm run lint` y `npm run format:check` en verde.
- [ ] Pruebas escritas para el comportamiento nuevo o corregido, y `npm test -- --watch=false` en verde.
- [ ] Prueba E2E agregada o actualizada, y en verde, si el cambio toca un flujo de usuario.
- [ ] `npm run build` en verde.
- [ ] Accesibilidad básica: label por campo, botones reales, `aria-label` en botones solo-ícono, contraste AA.
- [ ] Colores y tipografías desde los tokens de diseño; montos con `SolesPipe`.
- [ ] Estados vacío, carga y error resueltos con `<app-estado-lista>` donde hay datos remotos.
- [ ] PR revisado por otra persona (convención del equipo; GitHub no exige aprobaciones).
- [ ] CI verde: **Build y tests** y **Escaneo de secretos** (obligatorios); revisados los informativos (SonarCloud, Trivy, E2E, CodeQL).
- [ ] Documentación actualizada, y `CLAUDE.md` si cambia el mapa del proyecto.
- [ ] Sin secretos ni datos reales; commits siguiendo Conventional Commits.
