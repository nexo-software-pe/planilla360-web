# ADR 0002 — NgRx SignalStore en la planilla y pruebas E2E

Estado: aceptada (Fase 8b)

## 1. NgRx SignalStore solo en la planilla

**Decisión:** la pantalla de planilla usa un `PlanillaStore` (NgRx SignalStore); el resto de las features usa un servicio HTTP y `recurso()`.

**Por qué**
- La planilla es el único flujo con **estado compartido y transiciones**: borrador → calculada → cerrada, con validaciones que habilitan o bloquean el cierre, una acción en curso, un cierre idempotente que debe poder reintentarse y un sondeo del avance de las boletas. Varias partes de la pantalla dependen de lo mismo.
- Las demás pantallas son consultas y formularios sin estado compartido: un store allí sería ceremonia sin beneficio.

**Reglas que quedan en el store (y se prueban sin DOM)**
- `puedeCerrar` exige planilla calculada **y** cero validaciones pendientes.
- El cierre genera una `Idempotency-Key` y la **conserva si falla**: el reintento usa la misma clave y la API no cierra dos veces; se descarta al terminar bien.
- Tras cerrar, la API dispara la generación de boletas; el store sondea su estado cada 3 s sin encender la barra de carga global, hasta que no queden pendientes.

**Consecuencias:** el store se provee por pantalla (`providers: [PlanillaStore]`), así que no sobrevive a la navegación.

## 2. Pruebas E2E con Playwright, contra la API real

- Cubren los flujos por rol, incluidas las escrituras (crear empleado con contrato, importar Excel, horarios, aprobar y rechazar vacaciones con motivo, usuarios y áreas, cierre de planilla con boletas) y el refresh transparente del token: se envía un access token inválido, la API real responde 401 y se comprueba que el interceptor renueva la sesión sin que la persona lo note.
- No corren en el CI: necesitan la API con PostgreSQL, RabbitMQ y MinIO. El CI ejecuta lint, pruebas unitarias y build.
- **Datos propios por prueba**: cada una crea sus empleados y nombres únicos por API, para no depender del orden ni del estado que dejó otra.
- **Sesión**: la API limita el login a 5 por minuto por correo y rota el refresh token en cada uso; por eso se inicia sesión por la pantalla una vez por usuario y las demás pruebas retoman la última sesión guardada.
