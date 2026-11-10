# ADR 0003 — Pruebas E2E en el CI

Estado: aceptada e implementada (Fase 9)

## Contexto
Las pruebas Playwright (ADR 0002) recorren los flujos de cada rol contra la **API real** y hoy solo se ejecutan en local: necesitan PostgreSQL, RabbitMQ y MinIO, y la API corriendo con el seed. Mientras no estén en el CI, un cambio que rompa un flujo (en el front o en el contrato de la API) solo se detecta si alguien las corre a mano. En la 8b encontraron un error real que las pruebas unitarias no veían (un diálogo que recargaba la página).

## Decisión
1. **Correr los E2E en el CI en los PR hacia `staging`**, con *service containers* de GitHub Actions: PostgreSQL, RabbitMQ y MinIO (y WireMock para las consultas de DNI y RUC). Redis no hace falta.
2. **Si el job tarda demasiado** (referencia: más de 10 minutos de reloj, que retrasaría cada PR), se pasa a un **job nocturno** sobre `staging` más un disparador manual (`workflow_dispatch`) y una etiqueta `e2e` que lo fuerza en un PR concreto. Se mide en las primeras corridas y se decide con datos.
3. Los E2E **no se vuelven un check obligatorio** hasta que muestren una tasa de fallos espurios baja durante un par de semanas; antes de eso el job informa, pero no bloquea.

## Cómo se arma el job
- **Base limpia en cada corrida**: los contenedores son efímeros, así que el seed parte de cero y el flujo de cierre de planilla corre sobre el mes en borrador (sin anular nada).
- **La API**: el workflow del web obtiene `planilla360-api` en su rama `staging` y la arranca con el perfil `local` (`./mvnw spring-boot:run` o la imagen Docker construida en el CI del api), apuntando a los service containers. Espera a `/actuator/health/readiness` antes de empezar.
- **El front**: `npm run build` y se sirve el resultado (o `npm start`) en el 4200.
- **Navegador**: `npx playwright install --with-deps chromium` y `E2E_CANAL=` vacío (en local se usa el Chrome instalado).
- **Fiabilidad**: `retries: 1` solo en el CI, traza y captura de pantalla de las pruebas que fallan subidas como artefacto, e informe HTML.
- **Un solo worker**: las pruebas comparten base de datos; se mantiene `workers: 1`.

## Alternativas consideradas
- **Solo nocturno desde el principio**: más barato, pero un error llega a `staging` antes de detectarse y cuesta más rastrear qué cambio lo causó.
- **Mockear la API (`page.route`)**: rápido y sin infraestructura, pero deja de probar justo lo que valen estos E2E (contrato real, refresh del token, boletas con RabbitMQ y MinIO).
- **Docker Compose completo dentro del job**: reproduce mejor el entorno local, pero es más lento de arrancar y más difícil de depurar que los service containers.

## Consecuencias
- Cada PR al front paga el arranque de la API (compilar o bajar la imagen); se cachea Maven y el navegador de Playwright.
- Un cambio incompatible en la API detiene los E2E del front: es la señal buscada, y complementa al check de contrato OpenAPI del repo del api.
- Hay que fijar la versión de la rama del api contra la que se prueba (`staging`) y decidir qué pasa cuando los dos repos cambian a la vez.
- Los E2E del repo del api podrían dispararse también desde allí contra el front de `staging`; queda como mejora posterior.

## Resultado de la implementación (Fase 9)
- **Tiempo medido:** el job completo tarda entre 4,5 y 5,5 minutos (compilar la API, arrancarla con el seed, instalar Chromium y 34 pruebas), por debajo de la referencia de 10 minutos: **se queda en cada PR hacia `staging`**, sin job nocturno. Se puede lanzar a mano con `workflow_dispatch`.
- **Desvío del plan:** PostgreSQL, RabbitMQ y Mailpit son *service containers*; MinIO y WireMock se levantan con `docker run` en un paso, porque necesitan argumentos de arranque o archivos del repo del api que un service container no puede recibir.
- **El front se sirve con `npm start`** (servidor de desarrollo) contra la API en `localhost:8080`; no se prueba el build de producción.
- **Primera corrida:** destapó una prueba que solo pasaba con una base con uso previo (esperaba varias páginas de usuarios). Una base limpia, como la del CI, es justo lo que estas pruebas deben soportar.
- **Sigue sin ser check obligatorio**: hay que observar unas semanas de fallos espurios.
