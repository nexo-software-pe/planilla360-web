# Bienvenida al equipo del front (Día 1)

Esta guía es para quien se une a **Nexo Software S.A.C.** y va a trabajar en **planilla360-web**, la interfaz de Planilla360. No repite lo que ya está documentado: te lleva por el orden correcto y te dice dónde mirar. Los comandos están en sintaxis de Git Bash (Windows).

Documentos que vas a usar todo el tiempo: [README](../README.md) (puesta en marcha y scripts), [CLAUDE.md](../CLAUDE.md) (convenciones y mapa «dónde vive qué») y [CONTRIBUTING.md](../CONTRIBUTING.md) (flujo de PR y Definition of Done).

## 1. Tu primer día

### 1.1 Instala las herramientas

| Herramienta                          | Para qué                                    | Notas                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git**                              | clonar y versionar                          |                                                                                                                                                                        |
| **nvm-windows** con **Node 24.15.0** | ejecutar Angular y las pruebas              | `nvm install 24.15.0` y `nvm use 24.15.0`. Si `nvm use` falla, abre la terminal con permisos de administrador (ver el [problema 2](#2-node-con-la-versión-equivocada)) |
| Un editor (VS Code, WebStorm...)     | escribir código                             | Activa la integración con Prettier y ESLint                                                                                                                            |
| **Docker Desktop**                   | solo si vas a correr la API local o los E2E | Debe estar encendido antes de levantar la API                                                                                                                          |

No instales Angular CLI global: los scripts usan el de `node_modules`.

### 1.2 Clona e instala

```bash
git clone https://github.com/nexo-software-pe/planilla360-web.git
cd planilla360-web
node -v      # v24.15.0
npm ci
```

Usa `npm ci` (instala exactamente lo que fija `package-lock.json`), no `npm install`.

### 1.3 Levanta la API local

El front sin API no tiene login ni datos. Clona `planilla360-api` y sigue su [README](https://github.com/nexo-software-pe/planilla360-api/blob/staging/README.md) (secciones «Requisitos» e «Inicio rápido»). Cuando esté lista, esto responde:

```bash
curl http://localhost:8080/actuator/health
```

### 1.4 Arranca el front e inicia sesión

```bash
npm start        # ng serve en http://localhost:4200
```

Abre http://localhost:4200. Los usuarios y la contraseña común de desarrollo están en la sección «Usuarios de desarrollo» del [README de la API](https://github.com/nexo-software-pe/planilla360-api/blob/staging/README.md#usuarios-de-desarrollo-solo-perfil-local); son datos ficticios que solo existen en el perfil `local`. Entra con cada rol (RRHH, empleado, admin) para ver las tres caras de la app: el panel de administración, el portal del empleado (pensado para celular) y la vista de plataforma.

### 1.5 Comprueba que todo está sano

```bash
npm run lint
npm run format:check
npm test -- --watch=false
npm run build
```

Si los cuatro pasan en tu máquina, el entorno está listo.

## 2. Recorrido del código

El mapa completo está en [CLAUDE.md, «Dónde vive qué»](../CLAUDE.md#dónde-vive-qué). Aquí va el orden en que conviene leerlo.

1. **Estructura por feature.** `src/app/features/` tiene una carpeta por funcionalidad (`empleados`, `vacaciones`, `planilla`...). Cada una agrupa sus componentes, su servicio HTTP y sus pruebas. Lo compartido vive en `src/app/shared/`, la sesión y el HTTP en `src/app/core/`, y los cascarones (menú lateral, barra móvil) en `src/app/layout/`.
2. **Rutas lazy y guards.** Abre `src/app/app.routes.ts`. Cada pantalla se carga con `loadComponent` (un chunk por feature). Las rutas de `panel` pasan por `authGuard` y `rolGuard(...)` (en `core/auth/guards.ts`); los roles de personal son `ROLES_PERSONAL` (RRHH y ADMIN_EMPRESA). El menú por rol sale de `layout/navegacion.ts`: una pantalla nueva necesita ruta y entrada de menú.
3. **Sesión e interceptores.** `AuthService` (`core/auth/`) guarda la sesión con signals y renueva el token una sola vez aunque fallen varias peticiones a la vez. `authInterceptor` añade el token; `errorInterceptor` convierte los errores en `ApiError` y muestra un aviso global; `cargaInterceptor` alimenta la barra de progreso. Una petición que explica su propio error en pantalla usa el contexto `OMITIR_TOAST`.
4. **`recurso()` y `<app-estado-lista>`.** Toda pantalla de datos carga con `recurso(() => servicio.algo())` (`shared/recurso.ts`), que expone `datos`, `cargando` y `error`, y lo pinta dentro de `<app-estado-lista>` (cargando, error con reintento, vacío). No improvises estos estados.
5. **`SolesPipe`.** Los montos siempre con el pipe `soles` (`S/ 3 022,80`); las fechas con `fecha`. Nunca formatees a mano.
6. **Tokens de diseño.** Colores, tipografías y radios son variables CSS de `src/styles/_tokens.scss` (`var(--color-primario)`...). No uses colores sueltos.
7. **URL de la API.** Los servicios inyectan el token `API_URL` y arman `${this.api}/ruta`. Nunca escribas una URL a mano.

### Cómo seguir una pantalla: ruta, componente, servicio, API

Ejemplo con la bandeja de vacaciones:

1. En `app.routes.ts`, la ruta `panel/vacaciones` carga `VacacionesShell` y, dentro, `Bandeja` (`features/vacaciones/bandeja.ts`).
2. `Bandeja` inyecta `VacacionesService` y crea un `recurso(...)` con la consulta; la plantilla lo pinta con `<app-estado-lista>`.
3. `VacacionesService` (`vacaciones.service.ts`) hace `this.http.get` o `this.http.post` a `${this.api}/vacaciones/...`.
4. En el navegador, abre la pestaña **Red** y verás la petición a `http://localhost:8080/api/v1/vacaciones/...`; el controlador correspondiente está en el repo de la API.

Haz lo mismo con la pantalla que te toque: parte de la URL del navegador y baja hasta el endpoint.

### Cómo leer un test

Las pruebas usan Vitest con **Testing Library**: se renderiza el componente, se consulta lo que vería una persona (por rol o etiqueta, nunca por clase CSS) y se interactúa como ella. Abre `features/vacaciones/bandeja.spec.ts`: arma los datos de prueba (`solicitud(...)`, `permiso`), sustituye los servicios por dobles, hace `render(Bandeja, ...)` y comprueba con `screen` y `userEvent`. Pregúntate en cada test: ¿qué hace la persona y qué debería ver?

Los servicios HTTP se prueban con `probarPeticiones` (`shared/servicio.testing.ts`): una tabla de casos con método, URL y cuerpo (ejemplo: `vacaciones.service.spec.ts`). Los archivos `*.testing.ts` son utilidades de prueba que no entran al build: `shared/pruebas.testing.ts` (dobles de `DialogosService` y `NotificacionService`), `core/auth/pruebas-auth.testing.ts` (sesión simulada) y `shared/servicio.testing.ts`. Reutilízalos antes de crear nuevos.

## 3. Cómo trabajar un issue y tu primer PR

El flujo completo (ramas, Conventional Commits, CI, revisión) está en [CONTRIBUTING.md](../CONTRIBUTING.md#flujo-de-trabajo) y la lista de cierre en su [Definition of Done](../CONTRIBUTING.md#definition-of-done). Resumen mínimo:

1. Toma un issue y lee su criterio de aceptación completo.
2. `git switch staging && git pull`, y rama `<tipo>/<n>-<slug>`.
3. Escribe primero la prueba que falla; luego el código que la pone en verde.
4. Antes del PR: `lint`, `format:check`, `test`, `build`. PR a `staging` con la plantilla completa.

Tres consejos:

- **Empieza leyendo, no escribiendo.** Antes de tocar nada, sigue la pantalla del issue de punta a punta (ruta, componente, servicio, API) y reproduce el problema en el navegador.
- **Cambios pequeños.** Un PR que se revisa en 10 minutos se aprueba hoy; uno de 40 archivos, la semana que viene. Si el issue crece, divídelo y avisa.
- **Pide ayuda con contexto.** Cuando te atasques más de 30 minutos, escribe qué esperabas, qué pasó, qué probaste y el mensaje de error literal. Casi siempre hay una respuesta en la lista de abajo.

## 4. Problemas frecuentes

Formato: síntoma, causa, cómo diagnosticarlo, solución. Los comandos se probaron en Windows con Git Bash.

### 1. El puerto 4200 está ocupado

- **Síntoma:** `npm start` no sirve la app donde esperas, o http://localhost:4200 muestra otra aplicación. Si el otro proceso escucha en todas las interfaces (`0.0.0.0`) pero `localhost` sigue libre, el CLI avisa y arranca igual: `Port 4200 is in use on a wildcard address, but localhost:4200 is available. There may be another server running on a wildcard IP on port 4200.` En ese caso el navegador puede terminar hablando con el otro servidor. En una terminal interactiva, cuando el puerto está del todo ocupado, el CLI pregunta si quieres usar otro. En una terminal no interactiva (un script, un entorno sin teclado) no pregunta y termina con este error: `An unhandled exception occurred: Port 4200 is already in use. Use '--port' to specify a different port.` (más una línea que remite a un `angular-errors.log` temporal).
- **Causa:** otro `ng serve` (una terminal olvidada) u otro programa tiene el puerto.
  El `ng serve` de este proyecto escucha en `[::1]:4200` (IPv6 de `localhost`), no en `0.0.0.0`. Por eso otro programa que escuche en `0.0.0.0:4200` no lo bloquea (es el aviso de «wildcard» de arriba), mientras que otro `ng serve` o un servidor en `[::]:4200` sí.
- **Diagnóstico:**

  ```bash
  netstat -ano | findstr :4200
  ```

  La última columna de la línea `LISTENING` es el PID. Qué verás según el caso:

  - Otro `ng serve` de este proyecto: `TCP [::1]:4200 [::]:0 LISTENING 40028`. El puerto queda ocupado y un segundo `npm start` falla (o pregunta, si la terminal es interactiva).
  - Otro programa en todas las interfaces: `TCP 0.0.0.0:4200 0.0.0.0:0 LISTENING 45172`. Si además hay una línea `TCP [::]:4200 [::]:0 LISTENING` con el mismo PID, el puerto también está tomado en IPv6 y `npm start` falla con el error de arriba; si solo aparece la línea de `0.0.0.0`, `npm start` arranca igual con el aviso de «wildcard».

- **Solución:** cierra el proceso (si es tuyo y sabes qué es):
  ```bash
  taskkill //PID <pid> //F
  ```
  En Git Bash las opciones llevan barra doble (`//PID`, `//F`); en PowerShell o cmd, simple (`/PID`, `/F`). Tras cerrarlo, `netstat` ya no muestra la línea. Alternativa: `npm start -- --port 4300` (el flag `--port` existe en `ng serve`; por defecto 4200); el CLI informa `Local: http://localhost:4300/` y `netstat` muestra `TCP [::1]:4300 [::]:0 LISTENING <pid>`. Ojo: la API local solo permite por CORS el origen `http://localhost:4200` ([problema 4](#4-la-api-no-responde-o-error-de-cors)), así que con otro puerto el login fallará salvo que cambies la variable `CORS_ALLOWED_ORIGINS` de la API (está en su `.env.example` y en `src/main/resources/application-local.yml`, donde por defecto vale `http://localhost:4200`). Lo normal es liberar el 4200.

### 2. Node con la versión equivocada

- **Síntoma:** `npm start`, `npm test` o `npm run build` terminan enseguida con este mensaje (probado con Node 24.11.0):
  ```
  Node.js version v24.11.0 detected.
  The Angular CLI requires a minimum Node.js version of v22.22.3 or v24.15.0 or v26.0.0.
  ```
  Con `npm ci` verás avisos `npm warn EBADENGINE Unsupported engine` con la versión requerida y la actual.
- **Causa:** la terminal usa otra versión de Node que la del proyecto (`engines` de `package.json`).
- **Diagnóstico:**
  ```bash
  node -v
  nvm list        # el asterisco marca la versión activa
  ```
- **Solución:**
  ```bash
  nvm install 24.15.0
  nvm use 24.15.0
  node -v         # v24.15.0
  ```
  En Windows, nvm-windows cambia la versión con un enlace simbólico y necesita una terminal con permisos para crearlo: si `nvm use` falla o `node -v` no cambia, abre la terminal como administrador (o activa el modo desarrollador de Windows). Cierra y abre la terminal del editor, que arrastra el `PATH` anterior. Si cambiaste de versión después de instalar, repite `npm ci`.

### 3. La URL de la API está mal formada

- **Síntoma:** en la pestaña **Red** del navegador las peticiones van a una URL rara, como `http://localhost:8080/api/v1//empleados` (barra doble), `http://localhost:8080/api/v1empleados` (sin barra) o a `localhost:4200/api/v1/...` (el propio front). Resultado típico: 404 en las pantallas de datos.
- **Causa:** `apiUrl` mal escrita en `src/environments/environment.ts`. Los servicios arman `${this.api}/ruta`, así que `apiUrl` **no** debe terminar en `/`. Un servicio que escribió la URL a mano, saltándose `API_URL`, produce el mismo efecto.
- **Diagnóstico:** abre la pestaña **Red** (F12), filtra por «Fetch/XHR» y mira la URL completa de la petición fallida. Compárala con `src/environments/environment.ts` y `src/app/core/config/api-url.ts`. Busca URLs a mano con `grep -rn "http://localhost" src/app`.
- **Solución:** deja `apiUrl: 'http://localhost:8080/api/v1'` (sin barra final) y no subas al repo un cambio hecho solo para una prueba (`git diff src/environments`). En un servicio, usa siempre `inject(API_URL)`.

### 4. La API no responde o error de CORS

- **Síntoma:** el login no avanza y la app muestra «No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.» En la consola del navegador aparece `net::ERR_CONNECTION_REFUSED` (la API no está encendida) o un mensaje de CORS (`has been blocked by CORS policy`: la API responde, pero no admite tu origen).
- **Causa:** la API local no está levantada (por ejemplo, Docker Desktop apagado y la base sin arrancar), o el front corre en un origen distinto de `http://localhost:4200`, el único que permite el perfil `local` (por ejemplo, `http://127.0.0.1:4200` u otro puerto).
- **Diagnóstico:**
  ```bash
  curl http://localhost:8080/actuator/health
  ```
  Con la API apagada, curl responde `curl: (7) Failed to connect to localhost port 8080 ... Could not connect to server`. Encendida, devuelve el estado de salud en JSON. Comprueba además que la barra de direcciones dice exactamente `http://localhost:4200`.
- **Solución:** enciende Docker Desktop, levanta la API siguiendo su README y espera a que `actuator/health` responda. Abre el front en `http://localhost:4200`. Si necesitas otro origen, es la API la que debe permitirlo (variable `CORS_ALLOWED_ORIGINS`, en `.env.example` y `src/main/resources/application-local.yml` del repo de la API); no se arregla en el front.

### 5. `npm test` falla por tiempo agotado en una máquina cargada

- **Síntoma:** pruebas que pasan solas fallan al correr toda la suite con un mensaje de tiempo agotado (`Test timed out in ...ms`), sobre todo con la API compilando o Docker corriendo al lado.
- **Causa:** el render de Angular Material es lento con el equipo saturado y el límite por defecto de Vitest (5 s) se queda corto. `vitest-base.config.mts` ya sube los límites (20 s por test, 30 s por hook), limita los workers a 4 y marca como lentos los tests de más de 2 s (`slowTestThreshold`).
- **Diagnóstico:** corre solo el archivo que falla: `npm test -- --watch=false --include src/app/features/vacaciones/bandeja.spec.ts`. Si pasa solo, es carga de la máquina y no lógica.
- **Solución:** cierra procesos pesados y reintenta con `npm test -- --watch=false` (sin `--watch=false` queda vigilando y no termina). Si un test sigue lento con la máquina libre, el problema es del test: no subas los timeouts, optimízalo.

### 6. «Superaste el límite de intentos» en los E2E o con muchos logins seguidos

- **Síntoma:** el login o un E2E muestra «Superaste el límite de intentos. Reintenta en N segundos.» (respuesta 429).
- **Causa:** la API limita el login: por defecto **30 por IP y 5 por correo desde la misma IP, por minuto**. Una suite E2E sale toda de la misma IP y, en un equipo rápido, lo supera.
- **Diagnóstico:** pestaña **Red**: la respuesta del login es 429. Cuenta cuántos logins hiciste en el último minuto.
- **Solución:** espera un minuto y repite. No subas timeouts ni cambies los valores por defecto de la API. Detalle en el README, sección «Límite de intentos de login».

### 7. `npm ci` es muy lento o falla por la red

- **Síntoma:** `npm ci` tarda varios minutos o termina con errores de red como `ETIMEDOUT`, `ECONNRESET` o `EAI_AGAIN`.
- **Causa:** red lenta o inestable, un proxy corporativo o un antivirus que revisa cada archivo de `node_modules` (son miles).
- **Diagnóstico:** `npm ping` comprueba que el registro responde; `npm ci --loglevel verbose` muestra en qué paquete se queda.
- **Solución:** reintenta; cambia de red si puedes; excluye la carpeta del proyecto del análisis en vivo del antivirus; si quedó a medias, borra `node_modules` y repite `npm ci`. Con proxy, pide a TI los valores para `npm config set proxy` y `https-proxy`. No uses `npm install` para «arreglarlo»: puede modificar `package-lock.json`.
- **Avisos que no son errores:** al terminar, `npm ci` puede imprimir `N vulnerabilities` (por ejemplo, `11 moderate severity vulnerabilities`) con `To address issues that do not require attention, run: npm audit fix`, además de líneas `npm warn deprecated ...`. Son avisos informativos de `npm audit`: `npm ci` termina con código de salida 0 y puedes continuar; no ejecutes `npm audit fix` por tu cuenta, porque modificaría `package-lock.json`. Lo mismo vale para `npm warn EBADENGINE Unsupported engine`: aparece solo si tu Node no es el del proyecto (probado con Node 24.11.0), la instalación igualmente termina con código 0, pero los comandos del CLI se negarán a correr; corrige la versión según el [problema 2](#2-node-con-la-versión-equivocada). Con la versión correcta (24.15.0) no sale ningún EBADENGINE.

---

¿Algo de esta guía no te funcionó? Es un error de la guía: abre un issue o un PR con la corrección.
