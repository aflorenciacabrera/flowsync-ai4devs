# Cuándo delegar y cuándo especificar

Criterio de ataque para el trabajo de [`docs/backlog/`](./README.md). No decide *qué* construir; decide *cómo se le habla al agente*.

| | **Delegación directa** | **OpenSpec** |
|---|---|---|
| El trabajo es… | acotado, desechable, 1–2 archivos | lo que perdura, multicapa, auditable |
| El artefacto que queda | el diff | el spec (propuesta, diseño, tareas) más el diff |
| El prompt… | se tira al cerrar el ticket | se convierte en contrato que sobrevive a la sesión |
| Fallar cuesta… | rehacer un fichero | divergir capas, perder un criterio negativo, o congelar una decisión de producto por la vía de los hechos |

**Delegación directa** = un prompt de una sesión, con el criterio de aceptación ya escrito y la capa ya nombrada. El agente toca poco y se va. No hace falta que nadie vuelva a leer ese prompt.

**OpenSpec** = el trabajo cruza capas, fija una regla que otras piezas van a reutilizar, o deja un rastro que más adelante tiene que poder auditarse contra los criterios. El spec es el contrato; el código es una de sus consecuencias.

---

## El par que ilustra la frontera

Del backlog solo **FS-118** y **FS-142** traen tickets. El par más limpio está *dentro* de FS-118: dos tickets de la misma historia, uno a cada lado.

### Ticket A (lo atacaría por DELEGACIÓN DIRECTA): **FS-118.1 — Persistir la fecha de vencimiento**

**Por qué:** acotado / desechable / 1–2 archivos.

- **Acotado.** Una sola capa (Migración/DB), talla S, riesgo bajo. La entrega cabe en una frase: *el esquema pasa a representar una tarea con fecha y una sin ella*. El DoD es checklist de entrega (migración limpia, reverso, esquema regenerado, lint), no criterio de producto nuevo.
- **Desechable.** El prompt no aporta nada cuando la migración ya está aplicada y `database/schema.ts` regenerado. Nadie va a volver a ese enunciado para decidir si una tarea hecha con la fecha pasada está vencida: esa pregunta no vive aquí.
- **1–2 archivos.** La migración y el esquema generado. El tipo de columna, la nulabilidad y el índice *se deciden al implementar*, tal como pide el propio ticket: no hay diseño que preservar en un spec.

Delegarlo es más barato que especificarlo. Un OpenSpec aquí sería ceremonia: el contrato ya está en el ticket, y no hay segunda capa que pueda contradecirlo.

---

### Ticket B (lo atacaría con OPENSPEC): **FS-118.2 — Regla de vencimiento en el dominio**

**Por qué:** perdura / multicapa / auditable.

- **Perdura.** La regla *es* el producto de esta historia: cuándo una tarea está vencida (CA-5 a CA-10, CA-19, CA-20). FS-118.3 la expone, FS-118.4 la pinta, FS-118.5 la recorre por el camino del usuario. Si se implementa mal, los cuatro tickets de detrás la reimplementan cada uno a su manera, o peor: la congelan al guardar en lugar de resolverla al mirar.
- **Multicapa.** Aunque el ticket nombre «Modelo/Dominio», es el nodo del que cuelga el resto de la cadena. La decisión «el día de referencia es el de quien mira» no cabe en el modelo solo: condiciona el transformer, el frontend y las pruebas. Un prompt de una sesión no sujeta eso.
- **Auditable.** El ticket más peligroso de FS-118 pese a ser M. CA-5 es la trampa del día de más; CA-19 junto a CA-20 no se manifiesta hasta que alguien cruza la medianoche. Hace falta un spec que deje escrito *qué se prueba, con qué día de referencia y por qué la regla vive en un solo sitio*, para que un revisor (humano o `adversarial-reviewer`) pueda suspender contra algo que no sea el diff.

Delegarlo sería pedir al agente que invente la semántica en el modelo y que el resto de la cadena la adivine. OpenSpec es el sitio donde esa semántica se fija una vez.

---

## El resto de tickets, con el mismo rasero

Solo hay seis tickets escritos. Los otros cuatro no son el par didáctico, pero tampoco son neutros.

| Ticket | Enfoque | Por qué |
|---|---|---|
| **FS-118.1** Persistir la fecha | **Delegación directa** | Ver Ticket A. |
| **FS-118.2** Regla de vencimiento | **OpenSpec** | Ver Ticket B. |
| **FS-118.3** Fijar y retirar la fecha (API) | **OpenSpec** | Controller + validator + transformer + tipos generados + pruebas que escriben en la misma SQLite del dev. Multicapa aunque el ticket diga «Endpoint». El contrato de error (fecha inválida vs. fecha pasada admitida) tiene que poder auditarse contra CA-13 y CA-14. |
| **FS-118.4** Editar fecha en el detalle | **OpenSpec** | Frontend, API client, accesibilidad de la señal de vencida, y una decisión de diseño *antes* de empezar (no hay datepicker en el proyecto). Depende de PA-6. Un prompt no sujeta CA-16 (guardar solo) contra CA-14 (conservar el valor anterior si la fecha es inválida). |
| **FS-118.5** Cobertura y regresiones | **OpenSpec** | Porta los criterios negativos (CA-1, CA-11, CA-12, CA-18): la identidad del producto. Si carga con montar la base de pruebas (R-7), deja infraestructura que *perdura*. El spec es la lista de qué puede fallar y por qué; el código de test es la consecuencia. |
| **FS-142.1** Acotar la lista por estado | **OpenSpec** | Un solo ticket y sin migración, pero no es delegable. Mezclar «filtro inválido» con «filtro vacío» no se recupera más arriba, y CA-9 / CA-17 son incompatibles hasta que producto hable. El spec fija esa distinción y la decisión; el endpoint es una de sus consecuencias. Que sea «deliberadamente ligero» describe el *alcance*, no el *modo de ataque*. |

---

## Historias aún sin tickets

Descomponer es planificación de entrega: estas historias llegan con criterios, no con tickets. El enfoque se decide al descomponerlas, no ahora. Aun así, el rasero ya dice de qué lado caería cada una *si se atacara hoy*.

### Caerían en delegación directa (cuando existan tickets de una sola capa)

Historias baratas cuya regla cabe en el flujo que otra historia ya abrió. El ticket resultante, si nombra una capa y no inventa superficie, se delega.

| Historia | Por qué, llegado el momento |
|---|---|
| **E2-2** Título obligatorio | Validación sobre el crear que E2-1 ya entregó. Un validator (y el mensaje junto al campo). Acotado; el umbral de «desmedido» ni siquiera está decidido (PA-9), así que no hay semántica que preservar: hay un rechazo. |
| **E2-3** Nace mía y pendiente | Defaults en el mismo `store` de creación. Pegada a E2-1 a propósito: si E2-1 ya existe, esto es asignar `assignee` y `status` en 1–2 archivos. El «por qué» de los tres estados fijos ya está en el PRD. |
| **E2-6** Editar el título | «Cae casi sola una vez existe E2-5». Las reglas son *las mismas* que al crear: si se reespecifica, divergen. Un PATCH de un campo, reutilizando el validator. |

### Caerían en OpenSpec

Historias que arrancan dominio, cruzan lista y API, o dejan una decisión que el código no puede improvisar.

| Historia | Por qué |
|---|---|
| **E3-1** Lista compartida | Sustrato de todo lo demás. API + transformer (qué se expone del responsable) + frontend + empty state. Lo que se devuelva aquí lo consume el cliente para siempre. |
| **E2-1** Crear tarea | Arranca el dominio entero: migración, modelo, endpoint, validator, transformer, input de la lista. Sin esto no hay nada; el spec es el origen del agregado `Task`. |
| **E2-4** Cambiar estado desde la lista | El corazón del producto. Gesto de la lista + API + los tres destinos. PA-7 (transiciones legales, volver atrás desde Hecho) no está cerrado: un agente que lo «resuelva» en el prompt congela producto. |
| **E2-7** Reasignar responsable | Lista + API + el caso literal de PA-8 (te quitan la tarea que tienes abierta). Roles planos, sin notificación, siempre con responsable: criterios negativos que hay que poder auditar. |
| **E3-2** Lista viva | El requisito que el PRD llama el que distingue al producto. **Antes de descomponer hay que decidir cómo viaja el cambio**; esa decisión no la toma un ticket. Cruza servidor, transporte y UI (foco, scroll, texto a medio escribir). |
| **E2-5** Abrir una tarea | Superficie nueva, no contabilizada (PA-6). Descomponerla ahora decide por la vía de los hechos qué contiene la pantalla. El spec *es* el trabajo de PA-6, no un extra. |
| **E2-10** Borrar tarea | La única acción irreversible. Confirmación (CA-4, CA-5) es criterio de producto, no detalle de UI: un ticket que solo borre por API deja el guardarraíl sin construir. API + diálogo + el caso de doble borrado (PA-8). |
| **FS-118** (la historia, no un ticket) | Cinco tickets en serie, regla de husos, vista de detalle. El spec cubre la historia; los tickets se atacan según la tabla de arriba. |
| **FS-142** (la historia) | Un ticket, pero la contradicción CA-9 / CA-17 y la identidad «vacío ≠ inválido» piden contrato escrito. Ver FS-142.1. |

---

## Cómo no usarlo

- **No se especifica por tamaño de talla.** FS-118.2 es M y pide OpenSpec; FS-118.1 es S y se delega. FS-142.1 es un solo ticket M y aun así pide spec.
- **No se delega lo que tiene un punto abierto de producto.** PA-6, PA-7, PA-8, PA-9 y la contradicción CA-9 / CA-17 no se «resuelven» en un prompt. O se cierran antes, o el spec deja el hueco explícito.
- **No se escribe OpenSpec con doce historias de antelación.** El backlog ya lo dice: un ticket escrito demasiado pronto caduca. El spec se abre cuando esa unidad entra en la sesión de trabajo.
- **El primer ticket cuyo DoD pida pruebas carga con R-7.** Ese montaje *perdura* (aislar SQLite de test, hooks de `testUtils.db()`): aunque el ticket de negocio fuera delegable, la base de pruebas no lo es.

---

## Lectura rápida, en el orden del backlog

| # | Unidad | Ataque |
|---|---|---|
| 1 | E3-1 Lista compartida | OpenSpec |
| 2 | E2-1 Crear tarea | OpenSpec |
| 3 | E2-3 Nace mía y pendiente | Delegación (cuando E2-1 ya está) |
| 4 | E2-2 Título obligatorio | Delegación (cuando E2-1 ya está) |
| 5 | E2-4 Cambiar estado | OpenSpec |
| 6 | FS-142 / FS-142.1 Filtrar | OpenSpec |
| 7 | E2-7 Reasignar | OpenSpec |
| 8 | E3-2 Lista viva | OpenSpec |
| 9 | E2-5 Abrir tarea | OpenSpec |
| 10 | E2-6 Editar título | Delegación (cuando E2-5 ya está) |
| 11 | FS-118 Fecha de vencimiento | Mixto: **118.1 delega**; **118.2–118.5 OpenSpec** |
| 12 | E2-10 Borrar | OpenSpec |
