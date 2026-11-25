# ADR 0006 — Formato de montos y fechas

Estado: aceptada e implementada (Fase 7; registrada en la Fase 10)

## Contexto
Planilla360 muestra dinero (sueldos, descuentos, neto) y fechas (periodos, asistencias, vencimientos) en casi todas las pantallas. Un formato inconsistente en una boleta (`3022.8`, `S/3,022.80`, `2026-11-09`) resta confianza, y las fechas tienen un riesgo propio: `Date.toISOString()` convierte a UTC, y en Perú (UTC-5) una hora de la noche cae en el día siguiente.

## Decisión
1. **Montos solo con `SolesPipe`** (`shared/soles.pipe.ts`, `| soles`): formato de la interfaz (convención del proyecto) `S/ 3 022,80` (espacio como separador de miles, coma decimal, dos decimales). Acepta número o cadena y devuelve cadena vacía si el valor es nulo, vacío o no finito. Es el único lugar donde se formatea dinero.
2. **Fechas con `FechaPipe`** (`| fecha`, `dd/MM/yyyy`) y las funciones de `shared/fechas.ts`: `formatearFecha`, `formatearFechaHora` (`dd/MM/yyyy HH:mm`), `nombreDeMes` (`noviembre de 2026`) y `formatearMinutos` (`1 h 05 min`).
3. **Fechas siempre en hora local**: `aIso`, `hoyIso` y `mesActual` (`yyyy-MM`) arman la cadena con `getFullYear`/`getMonth`/`getDate`; **nunca `toISOString`**. `formatearFecha` toma la parte `yyyy-MM-dd` de la cadena sin crear un `Date`, para no correr el día por la zona horaria.
4. **No se formatea a mano** dinero ni fechas de negocio en plantillas o componentes: ni `toFixed` para soles, ni concatenaciones de `dd/mm/yyyy`.
5. **Excepciones acotadas** (cifras que no son soles ni fechas de negocio): los porcentajes y factores de los parámetros legales (`features/saas/parametros-legales.ts` usa `toFixed(4)` con coma decimal) y la hora de una marcación en el portal (`features/portal/portal-inicio.ts` usa `toLocaleTimeString('es-PE')`).

## Alternativas consideradas
- **`CurrencyPipe`/`DatePipe` de Angular con el locale `es-PE`**: son estándar, pero exigen registrar los datos del locale y su separador de miles no coincide con el elegido para la interfaz (`S/ 3 022,80`); el pipe propio es corto y está probado.
- **Una librería de fechas (date-fns, Luxon)**: resolvería zonas horarias de forma completa, pero para un puñado de formatos fijos agrega una dependencia.
- **Formatear en la API y enviar texto**: acopla la presentación al servidor y rompe cálculos y ordenamientos del front.

## Consecuencias
- Un solo lugar para cambiar el formato; boletas, tablas y diálogos se ven igual.
- Los montos viajan como números o cadenas de la API y se formatean solo al mostrarlos; el cálculo del dinero no se hace en el front.
- `soles.pipe.spec.ts` y `fechas.spec.ts` fijan los formatos.
- Quien necesite un formato nuevo lo agrega a `shared/fechas.ts` o a un pipe, no en el componente.
