# ADR 0001 — Librería de componentes y manejo de la sesión

Estado: aceptada (Fase 7)

## 1. Librería de componentes: Angular Material

**Opciones:** Angular Material (con Angular CDK) o PrimeNG.

**Decisión:** Angular Material.

**Por qué**
- Los tokens del diseño aprobado son variables CSS (`src/styles/_tokens.scss`). Material 3 se tematiza con variables CSS del sistema (`--mat-sys-*`) y de cada componente (`--mat-button-*`, `--mat-snack-bar-*`), así que se mapean a nuestros tokens en `styles.scss` sin tocar estilos internos.
- Es la librería oficial del equipo de Angular: versiones alineadas con el framework, accesibilidad (ARIA, foco, teclado) cuidada y compatible con signals y componentes standalone.
- Se usa con moderación: campos de formulario, botones, barra de progreso y toasts. El layout, las tarjetas y las tablas son propios y usan los tokens directamente.

**Consecuencias**
- La paleta base de Material es `cyan`; el primario real sale de `--color-primario`. Si se cambia un token, se cambia en `_tokens.scss` y el tema lo sigue.
- Las tablas con ordenación y paginación se resolverán en la Fase 8 (`MatTable`/CDK o tabla propia) según lo que pida cada pantalla.

## 2. Sesión: access en memoria, refresh en `localStorage`

- El **access token** (15 min) vive solo en memoria (no sobrevive a una recarga).
- El **refresh token** (7 días, con rotación) se guarda en `localStorage` para restaurar la sesión al recargar o volver a abrir la pestaña. Es necesario para el portal del empleado en móvil, donde se espera no volver a iniciar sesión cada vez.
- **Riesgo asumido:** un XSS podría leer el refresh token. Se mitiga con la rotación (un token robado y usado invalida el de la persona) y con las prácticas habituales de Angular (sin `innerHTML` sin sanear). La alternativa, una cookie `HttpOnly` emitida por la API, exige cambios de contrato y CORS con credenciales; queda como mejora si el análisis de seguridad (Fase 9) la pide.
- Si el almacenamiento no está disponible, la sesión dura lo que dure la pestaña.

## 3. Refresh transparente

- `authInterceptor` agrega el JWT solo a las URL de la API y, ante un 401, pide **un** token nuevo y repite la petición. Varias peticiones con 401 simultáneas comparten esa única llamada (`shareReplay`).
- Solo un rechazo del servidor (4xx) al renovar cierra la sesión y manda al login con `returnUrl`; un corte de red no la destruye.
- Orden de interceptores: carga → errores → autenticación. El de errores ve el resultado final, ya tras el refresh.

## 4. Errores y carga globales

- `errorInterceptor` convierte los errores HTTP en `ApiError` (lee `application/problem+json`) y muestra un toast, salvo el 401 o si la petición declara `OMITIR_TOAST` (p. ej. el login, que muestra su mensaje en el formulario). En errores 5xx no se muestra el detalle técnico.
- `cargaInterceptor` alimenta un contador (`CargaService`) que enciende una barra de progreso global; `OMITIR_CARGA` excluye sondeos.
