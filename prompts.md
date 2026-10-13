# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Fable 5.1 (claude-fable-5-1)
**Herramienta:** Claude Code

```
Escribe tests funcionales del requisito «Cuándo una tarea está vencida» de openspec/specs/tasks/spec.md. Un test por Scenario, solo esos siete, en backend/tests/functional/tasks/overdue.spec.ts.

Entran por HTTP, como el cliente. El id es el que devuelve POST /api/v1/tasks. La fecha se fija con PUT /api/v1/tasks/:id/due-date. El estado, con PATCH /api/v1/tasks/:id/status. Se lee con GET /api/v1/tasks/:id. Comprueba isOverdue en el cuerpo de la respuesta.

El día de referencia va en la petición, en el parámetro today con formato AAAA-MM-DD. No uses la fecha de hoy ni ningún reloj. Fechas fijas, por ejemplo 2026-08-12 y 2026-08-13.

Aislamiento igual que backend/tests/functional/tasks/assignee.spec.ts: group.each.setup(() => testUtils.db().withGlobalTransaction()). Correos en example.com.

Estos dos no se leen en el mismo sitio:
- «Darla por hecha la deja de vencer»: el PATCH de estado no devuelve isOverdue ni dueDate. Márcala done y comprueba en un GET posterior que isOverdue es false y que dueDate no cambió.
- «Aplazar resuelve el vencimiento»: isOverdue false tiene que salir en la misma respuesta del PUT de la fecha.

No toques nada fuera de backend/tests/. Ni el modelo, ni el controlador, ni el transformer, ni la spec. Si un test falla, déjalo en rojo: no arregles isOverdueOn. No borres los tests que ya hay en ese archivo. No juntes dos Scenarios en un mismo test.

```

**Qué salió:** escribió los siete tests a la primera; 4 en verde y 3 en rojo (los que esperan `isOverdue: true`), porque `due_date` llega del driver como `Date` y el `<` de `isOverdueOn` compara `Date` con texto. Se dejaron en rojo, como pedía el prompt.

## Prompt 2

**Modelo:** Fable 5.1 (claude-fable-5-1)
**Herramienta:** Claude Code

```
Crea backend/tests/unit/ y escribe ahí los bordes de isOverdueOn, el método de backend/app/models/task.ts. Sin servidor, sin base de datos y sin HTTP: new Task(), asigna dueDate y status en memoria y llama al método. No uses save, ni el reloj, ni la fecha de hoy. Fechas fijas, por ejemplo 2026-08-12 y 2026-08-13.

Un test por borde:
- fecha anterior al día de referencia, y la tarea sin hacer: vencida
- fecha exactamente igual al día de referencia: no vencida
- fecha posterior: no vencida
- sin fecha, dueDate null: no vencida
- tarea en estado done con la fecha pasada: no vencida

Y un caso más, que no sale de la spec: la misma fecha pasada y el mismo día de referencia, una vez con dueDate en texto AAAA-MM-DD y otra con un Date. Las dos llamadas devuelven lo mismo, y las dos dicen que está vencida. El tipo declara string | null; el Date es el valor que de verdad llega al leer la columna, así que asígnalo en el test sin cambiar el modelo.

No toques nada fuera de backend/tests/unit/. Si un test falla, déjalo en rojo: no arregles isOverdueOn.
```

**Qué salió:** seis tests en `backend/tests/unit/task_overdue.spec.ts` a la primera; 4 en verde y 2 en rojo: «tarea hecha con la fecha pasada» (el método no mira el estado) y «texto vs Date» (el `<` con un `Date` da `false`). Se dejaron en rojo, como pedía el prompt.

## Prompt 3

**Modelo:** Fable 5.1 (claude-fable-5-1)
**Herramienta:** Claude Code

```
# Hallazgos

## 1. Casos nuevos en rojo y los que ya había en verde

De los 13 casos nuevos fallaron 5: en `make test-e2e` la pantalla dio 44 passed, 3 failed (47), y esos 3 son del archivo nuevo, así que los 40 que ya había siguieron en verde; en `make test-unit` dio 4 passed, 2 failed (6), y no había ninguno unitario antes.

## 2. Cuáles pasaron, y por qué

Pasaron los 4 funcionales que esperan `isOverdue` en false y los 4 unitarios que comparan dos textos o un null. Los 3 funcionales que fallaron son los únicos que exigen `true` después de releer la tarea: `due_date` vuelve como `Date` y el `<` contra un texto da siempre false, así que «hecha con la fecha pasada» sale verde sin mirar el estado. En unitarios, con la fecha en texto, ese mismo caso falla porque el método devuelve true, y el del `Date` falla porque no vence.

## 3. La duda

«Darla por hecha» y «aplazar» murieron en el assert de que antes estaba vencida, así que no llegué a ver ni el cambio a `done` ni la respuesta del PUT; tampoco imprimí el tipo real de `dueDate` al salir de la base, lo deduje del driver y de que todo `true` llega `false`.
```

**Qué salió:** se contrastó contra las suites completas y los recuentos cuadran (44/3 de 47 y 4/2 de 6). La duda del punto 3 se cerró con una prueba desechable que imprimió el valor real: tras `findOrFail`, `dueDate` es un `Date`; el GET lo devuelve como `2026-08-12T00:00:00.000Z` con `isOverdue: false`; la respuesta del PUT sí dice `isOverdue: true` porque ahí la fecha aún es el texto del validador.

## Prompt 4

**Modelo:** Fable 5.1 (claude-fable-5-1)
**Herramienta:** Claude Code

```
escribir el hallazgo
```

**Qué salió:** reescribió `HALLAZGOS.md`, que aún traía la plantilla del ejercicio de migraciones, con los tres puntos del README de este módulo y una línea por punto, a partir del texto del Prompt 3 y con la duda ya cerrada.
