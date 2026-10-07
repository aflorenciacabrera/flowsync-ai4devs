# Hallazgos

Aquí van **las tres líneas** del ejercicio, una por cada punto de abajo. Es lo único que hay que
traer hecho: un cambio de motor a medias con estas tres líneas escritas vale más que lo contrario,
porque lo que se discute en el directo es dónde te chocaste.

Escribe **una sola línea por punto**, con tus palabras y con lo que mediste, no con lo que suponías.

## 1. Las filas que cambian y la rama

Cuántas filas cambian de valor en tu cambio de esquema, medido con una consulta, y en qué rama del
árbol de reversibilidad cae. Si tu migración no toca datos, dilo tal cual: también es una respuesta.

- Cambian **0 filas**: ninguna de las 4 migraciones reescribe datos (0 `update`/`insert`/`raw` en `database/migrations/`, y `git diff` sobre esa carpeta vacío), y la consulta `count(*)` sobre `users`, `tasks` y `auth_access_tokens` en Postgres devolvió 0 en las tres (y 0 en `count(due_date)`); el SQLite de origen también tenía 0 filas, así que no hay datos que mover. Por cómo se deshace, cae en la rama de lo que se deshace sin perder nada: volver a SQLite es revertir `config/database.ts` y `.env`, y las tablas de Postgres se tiran con el `down()` de cada migración o bajando el contenedor, sin ningún dato que recuperar.

## 2. Lo que la batería de pruebas no podía ver

Una cosa que la batería de pruebas no podía ver. Si no encontraste ninguna, escribe qué buscaste y dónde.

- Antes del test de vencimiento la suite no veía que `pg` entrega las columnas `date` como `Date` mientras `schema.ts`, fijado por `schema_rules.ts`, declara `due_date` como `string`, y por eso una tarea con vencimiento 2026-10-01 consultada el 2026-10-07 devolvía `isOverdue: false`; lo busqué en el `typecheck` (verde, porque el tipo declarado dice `string`), en el diff de `schema.ts` contra `s10/start` (vacío: lo fija `schema_rules.ts`) y en `isOverdueOn` (`this.dueDate < referenceDay`, que con un `Date` contra un `string` da `false` siempre), y lo cerré con un `GET` real que relee la tarea y con el parser del oid 1082 en `config/database.ts`.

## 3. Tu duda

De qué dudaste, o qué no pudiste comprobar.

- No pude comprobar que el cambio de motor sea inocuo con datos de verdad, porque el SQLite de origen estaba vacío (0 filas) y mi `0` es cierto pero trivial: no sé cómo llegarían a Postgres fechas o tokens guardados como texto en un SQLite poblado; además el parser del oid 1082 es global y hoy solo afecta a `tasks.due_date` (la única columna `date`, según `information_schema`), pero cualquier columna `date` futura llegará también como texto sin que nada lo avise; y las etiquetas exactas del árbol de reversibilidad no están en el repo, así que clasifiqué por cómo se deshace con mis palabras.
