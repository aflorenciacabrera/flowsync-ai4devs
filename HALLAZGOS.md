# Hallazgos

Aquí van **las tres líneas** del ejercicio, una por cada punto de abajo. Es lo único que hay que
traer hecho: una parte A a medias con estas tres líneas escritas vale más que lo contrario,
porque lo que se discute en el directo es dónde te chocaste.

Escribe **una sola línea por punto**, con tus palabras y con lo que mediste, no con lo que suponías.

## 1. Casos nuevos en rojo y los que ya había en verde

Cuántos de tus casos nuevos fallaron y cuántos de los que ya había siguieron en verde, con la cifra
que te dio la pantalla.

- De los 13 casos nuevos fallaron 5: `make test-e2e` dio `44 passed, 3 failed (47)` y los 3 rojos son de `overdue.spec.ts`, así que los 40 que ya había siguieron en verde; `make test-unit` dio `4 passed, 2 failed (6)`, y antes no había ningún unitario.

## 2. Cuáles pasaron, y por qué

Cuál de tus casos nuevos PASÓ, si alguno pasó, y por qué crees que pasó. Se deduce mirando qué
tienen en común los que fallaron.

- Pasaron los 4 funcionales que esperan `isOverdue` en false y los 4 unitarios que comparan dos textos o un null; los 3 funcionales rojos son los únicos que exigen `true` tras releer la tarea, porque `due_date` vuelve de la base como `Date` y el `<` contra un texto da siempre false, así que «hecha con la fecha pasada» sale verde sin que el método mire el estado; en unitarios, con la fecha en texto, ese mismo caso falla porque el método devuelve true, y el del `Date` falla porque no vence.

## 3. La duda

De qué dudaste, o qué no pudiste comprobar.

- «Darla por hecha» y «aplazar» murieron en el assert de que antes estaba vencida, así que no llegué a ver ni el cambio a `done` ni la respuesta del PUT, y el tipo real de `dueDate` lo deduje del driver antes de comprobarlo con una prueba desechable: tras `findOrFail` es un `Date`, el GET lo devuelve como `2026-08-12T00:00:00.000Z` con `isOverdue: false`, y el PUT sí dice `true` porque ahí la fecha aún es el texto del validador.
