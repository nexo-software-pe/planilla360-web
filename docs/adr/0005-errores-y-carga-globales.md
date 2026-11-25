# ADR 0005 — Manejo global de errores y de carga

Estado: aceptada e implementada (Fase 7; registrada en la Fase 10)

Este ADR amplía y detalla el [ADR 0001](0001-componentes-y-sesion.md), secciones 3 y 4 (orden de interceptores, errores y carga globales); no los reemplaza.

## Contexto
La API responde los errores como `application/problem+json` (`title`, `detail` y, en validaciones, una lista `errores` por campo). Si cada componente interpretara el `HttpErrorResponse` y decidiera cómo avisar, los mensajes serían inconsistentes, habría pantallas sin aviso y no habría un indicador de carga uniforme.

## Decisión
1. **`ApiError`** (`core/http/api-error.ts`) es lo único que reciben los componentes: lleva `estado`, `titulo`, `detalle`, `errores: ErrorCampo[]` (`{ campo, mensaje }`) y un getter `mensaje`. `ApiError.desde` lee `title`, `detail` y `errores` del cuerpo; si faltan, usa un mensaje en español por estado (0 sin conexión, 400, 401, 403, 404, 409, 422, 429). En los 5xx **no** se muestra el `detail` del servidor, sino un mensaje genérico.
2. **`errorInterceptor`** convierte todo `HttpErrorResponse` en `ApiError` y avisa con un toast global (`NotificacionService.error`). El 401 no avisa: lo resuelve `authInterceptor` (refresh transparente o cierre de sesión).
3. **`OMITIR_TOAST`** (`core/http/contexto-http.ts`, un `HttpContextToken`) desactiva el toast de una petición que maneja su error en pantalla. Hoy lo usa `AuthService` (`SIN_AVISO`) en el login, el refresh, `/auth/me` y el logout.
4. **Errores 400 con `errores[]`**: el formulario los coloca en el campo que corresponde. Por ejemplo, `empleado-form.ts` marca `control.setErrors({ servidor: mensaje })` en cada campo reconocido y junta el resto en un mensaje general (o usa `e.mensaje` si no hubo lista).
5. **`cargaInterceptor` + `CargaService`**: el interceptor suma una petición pendiente al iniciar y la resta con `finalize`; `CargaService.activa` es un `computed` verdadero mientras haya alguna pendiente (el contador no baja de cero). `App` lo muestra como una `mat-progress-bar` indeterminada con `aria-label="Cargando"`. **`OMITIR_CARGA`** excluye peticiones que no deben encender la barra: el sondeo del estado de las boletas (`planilla.service.ts`) y el refresh del token.
6. **Orden de los interceptores** en `app.config.ts`: `cargaInterceptor` (el más externo), `errorInterceptor` y `authInterceptor` (el más cercano a la red). Así el de errores ve el resultado final, ya tras el refresh transparente.

## Alternativas consideradas
- **Manejar el error en cada componente**: máxima flexibilidad, pero se repite el código y es fácil olvidar el aviso. `OMITIR_TOAST` conserva la flexibilidad donde hace falta.
- **Un `ErrorHandler` global de Angular**: atrapa excepciones no controladas, no las respuestas HTTP con su estado y su cuerpo estructurado; es complementario, no sustituto.
- **Un indicador de carga por pantalla**: más preciso, pero cada pantalla lo reimplementa; se optó por uno global y la exclusión puntual con `OMITIR_CARGA`.

## Consecuencias
- Un error de la API siempre llega al usuario en español, con el mismo estilo, aunque el componente no haga nada.
- Quien llama a la API y quiere su propio manejo debe acordarse de `OMITIR_TOAST`; si no, el usuario verá además el toast.
- Los componentes capturan `ApiError` (no `HttpErrorResponse`) y pueden usar `errores` para la validación del servidor.
- La barra global no distingue qué petición está en curso; si una pantalla necesitara un estado de carga propio, lo lleva localmente.
- `error.interceptor.spec.ts`, `api-error.spec.ts` y `carga.service.spec.ts` fijan el comportamiento.
