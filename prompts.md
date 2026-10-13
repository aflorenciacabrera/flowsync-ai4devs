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

guardar en promts el resultado
```

**Qué salió:** escribió los siete tests a la primera; 4 en verde y 3 en rojo (los que esperan `isOverdue: true`), porque `due_date` llega del driver como `Date` y el `<` de `isOverdueOn` compara `Date` con texto. Se dejaron en rojo, como pedía el prompt.
