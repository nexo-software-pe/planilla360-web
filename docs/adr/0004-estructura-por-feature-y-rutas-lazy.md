# ADR 0004 — Estructura por feature, rutas lazy y guards por rol

Estado: aceptada e implementada (Fase 10, 2026-11-24)

## Contexto
La aplicación sirve a cuatro roles (`ADMIN_SAAS`, `ADMIN_EMPRESA`, `RRHH`, `EMPLEADO`) con pantallas muy distintas: un panel de administración y un portal móvil para el empleado. Cargar todo en un solo paquete haría que un empleado descargue el código de planilla y administración que nunca verá, y repartir las reglas de acceso entre componentes dificultaría saber quién puede entrar adónde.

## Decisión
1. **Una carpeta por feature en `src/app/features/`** (`empleados`, `asistencia`, `vacaciones`, `planilla`, `admin`, `saas`, `portal`, `login`, `errores`…), con sus componentes y su servicio HTTP. Lo transversal vive en `core/` (auth, http, config) y `shared/` (pipes, diálogos, utilidades); los marcos de pantalla, en `layout/`.
2. **Todas las rutas se cargan en diferido** en `src/app/app.routes.ts`: `loadComponent` con `import()` para cada pantalla y layout. Los grupos con hijas (`panel`, `portal`, `empleados`, `asistencia`, `vacaciones`, `planilla`) cuelgan sus pantallas como `children`, con un componente _shell_ cuando hay navegación interna (`asistencia-shell`, `vacaciones-shell`). Cada ruta con pantalla lleva `title` con el sufijo « · Planilla360».
3. **El acceso se decide con guards funcionales** de `core/auth/guards.ts`: `authGuard` (exige sesión y recuerda `returnUrl`), `rolGuard(...roles)` (si el rol no está permitido, redirige a `/acceso-denegado`) e `invitadoGuard` (el login manda a quien ya inició sesión a su pantalla de inicio). `panel` combina `authGuard` con `rolGuard(...ROLES_ADMINISTRACION)`, `portal` con `rolGuard('EMPLEADO')`, y cada sección se restringe además con `ROLES_PERSONAL` (`ADMIN_EMPRESA`, `RRHH`), `rolGuard('ADMIN_EMPRESA')` o `rolGuard('ADMIN_SAAS')`. Las constantes de roles están en `core/auth/auth.models.ts`, junto a `rutaInicialPara(rol)`.
4. **El menú sale de datos por rol**: `layout/navegacion.ts` define `NAVEGACION_ADMIN` y `NAVEGACION_PORTAL` como listas de `{ etiqueta, ruta, roles }`, y `itemsPara(items, rol)` filtra lo que cada rol ve. Los layouts lo consumen con un `computed`.
5. **Una feature nueva** agrega su ruta lazy con su guard y su entrada de menú (con los mismos roles que el guard).

## Alternativas consideradas
- **Módulos NgModule por feature**: es la forma anterior de Angular; los componentes _standalone_ con `loadComponent` dan el mismo corte de paquetes con menos archivos.
- **Un único paquete (sin lazy)**: más simple, pero el empleado descargaría todo el panel. Se descartó por el peso inicial.
- **Ocultar opciones solo en el menú, sin guards**: deja la URL escrita a mano abierta; el guard es la barrera y el menú solo la comodidad.
- **Derivar el menú de la configuración de rutas** (datos en `data` de cada ruta): evitaría duplicar los roles, pero acopla el router a la presentación; se prefirió una lista explícita y legible.

## Consecuencias
- Cada pantalla es un _chunk_ aparte: el primer paquete es pequeño y la navegación entre secciones paga una descarga corta.
- **Los roles viven en dos sitios** (el guard de la ruta y la entrada del menú): hay que mantenerlos alineados; `navegacion.spec.ts` y `layouts.spec.ts` cubren el filtrado por rol.
- Los guards solo protegen la interfaz: la autorización real la aplica la API, que responde 403 si hace falta.
- Una ruta desconocida cae en la página 404 (`**`) y un rol no permitido, en `/acceso-denegado`, ambas con el componente `PaginaError` reutilizado.
