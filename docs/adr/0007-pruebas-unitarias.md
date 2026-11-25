# ADR 0007 — Pruebas unitarias: Testing Library sobre Vitest

Estado: aceptada e implementada (Fase 10, 2026-11-24)

## Contexto
Las pruebas unitarias deben sobrevivir a refactores de la plantilla y reflejar lo que ve el usuario (incluido el lector de pantalla), no la estructura interna del componente. Además, deben pasar de forma estable en el CI y en la máquina de quien desarrolla, que suele estar ocupada (la API compilando al lado).

## Decisión
1. **Testing Library para Angular** (`@testing-library/angular`, con `@testing-library/user-event` y `@testing-library/jest-dom/vitest`, cargado en `src/test-setup.ts`) sobre el ejecutor de **Vitest** que integra `ng test` (`@angular/build:unit-test`).
2. **Consultas por rol y etiqueta**, como las usa una persona: `getByRole`, `getByLabelText`, `getByText`. Los specs actuales no usan `data-testid` ni `querySelector`. Si no se puede consultar por rol o etiqueta, probablemente el componente no es accesible.
3. **Helpers `*.testing.ts`** para no repetir preparación: `shared/pruebas.testing.ts` (dobles de `DialogosService` y `NotificacionService`, y `proveedoresTransversales` para `render`), `shared/servicio.testing.ts` (`montarServicio` y `probarPeticiones`, que verifican método, URL, cuerpo y respuesta de cada llamada HTTP de un servicio) y `core/auth/pruebas-auth.testing.ts` (configuración HTTP con los interceptores reales). El sufijo `.testing.ts` los distingue de los `.spec.ts`, que son lo único que el ejecutor toma como pruebas.
4. **Credenciales ficticias de baja entropía** en las pruebas (`'x'`, `'aaaaaaaaaa1'`), para no disparar el escaneo de secretos del CI.
5. **Timeouts y workers en `vitest-base.config.mts`** (enlazado en `angular.json` como `runnerConfig`): `testTimeout: 20000`, `hookTimeout: 30000`, `maxWorkers: 4` y `slowTestThreshold: 2000`.

## Por qué esa configuración (P0-08)
En una máquina Windows cargada, `npm test` fallaba por timeouts de 5 s (el valor por defecto) en decenas de pruebas, aunque las aserciones eran correctas y en el CI pasaban. La causa medida fue la **saturación de CPU**: un worker por núcleo (16 en esa máquina), más el resto de procesos, hacía que el renderizado de Angular Material superara el límite. Sin el arreglo, `staging` fallaba 44 de 316 pruebas; con él, `npm test` pasó 316 de 316 en 4 corridas, también con procesos de carga en paralelo. Por eso:
- Se limitan los workers (`maxWorkers: 4`) para dejar CPU al resto.
- Se sube el tiempo máximo como red de seguridad, no como licencia para pruebas lentas.
- `slowTestThreshold: 2000` mantiene visibles en el reporte las pruebas que pasan de 2 s, para poder corregirlas.

## Alternativas consideradas
- **Jest o Karma/Jasmine**: Vitest es el ejecutor del builder de Angular que ya usa el proyecto; cambiarlo no aporta nada que lo justifique.
- **Pruebas por `data-testid` o por clases CSS**: son más cortas de escribir, pero se rompen con cada cambio visual y no verifican la accesibilidad.
- **Solo subir el timeout sin limitar los workers**: oculta la saturación y alarga las corridas; atacar la causa evita que reaparezca.
- **Preparar `TestBed` a mano en cada spec**: duplica código; los helpers lo centralizan.

## Consecuencias
- Las pruebas describen el comportamiento visible y sirven de ejemplo de uso accesible.
- Limitar los workers alarga algo la corrida completa en máquinas potentes; se aceptó a cambio de estabilidad.
- Un helper compartido que cambia afecta a muchos specs; hay que tocarlo con cuidado.
- La cobertura se mide con `@vitest/coverage-v8` y los flujos de extremo a extremo se cubren aparte con Playwright (ADR 0002 y 0003).
