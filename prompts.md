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


---

## Prompt 1

**Modelo:** Sonnet 5.5
**Herramienta:** Claude Code

```
Migra FlowSync de SQLite a PostgreSQL corriendo en Docker, con dos bases: una de desarrollo y otra de pruebas.

Restricciones, no negociables:

- El fichero de Compose se llama compose.yaml y los dos servicios se llaman db y db-test.
- La imagen es pgvector/pgvector:pg17.
- Los puertos son 54410 para desarrollo y 54411 para pruebas. No el 5432.
- La base de pruebas va en memoria, sin volumen. Es efímera a propósito.
- Los dos servicios llevan comprobación de salud, y el arranque espera a que estén sanos. La imagen, la primera vez, crea la base y no acepta conexiones mientras tanto.
- Sin la clave version: en el fichero de Compose.
- La batería de pruebas apunta a la otra base por su propio fichero de entorno, que el framework carga solo cuando el entorno es de pruebas (NODE_ENV=test ya lo pone backend/bin/test.ts; Adonis carga .env y luego .env.test).
- Deja atajos en el Makefile para levantar las bases, pararlas, migrar las dos y correr las pruebas.
- Ninguna migración existente se toca. Si hace falta cambiar una, párate y anótalo: no la edites.

Estado actual del repo:

- La conexión por defecto está en backend/config/database.ts: client better-sqlite3, fichero tmp/db.sqlite3. El bloque pg está comentado y no incluye schemaGeneration; consérvalo al activar pg.
- Las variables de entorno se validan en backend/start/env.ts. Añádelas con node ace env:add (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE) para que entren en .env, .env.example y el schema.
- backend/.env.test hoy solo tiene SESSION_DRIVER=memory. Ahí van el puerto 54411 y el nombre de la base de pruebas; no pierdas SESSION_DRIVER=memory.
- backend/.env.example no tiene variables de base de datos.
- El Makefile tiene setup, install, env, migrate (solo node ace migration:run), start y clean. make setup tiene que levantar las bases antes de migrar. El arranque que espera salud es docker compose up -d --wait.
- Instala el paquete pg en backend/. La conexión por defecto pasa a ser pg.
- No toques frontend. No hagas la parte B ni escribas HALLAZGOS.md.

Al terminar, comprueba y dime el resultado de cada punto:

1. docker compose up -d --wait deja db y db-test sanos.
2. git diff sobre backend/database/migrations/ está vacío.
3. Las dos bases migran (desarrollo y NODE_ENV=test).
4. (cd backend && npm test) queda en verde contra la base del puerto 54411.
5. db-test no tiene volumen.

```

**Qué salió:**  funcionó a la primera

---

## Prompt 2

**Modelo:** Sonnet 5.5
**Herramienta:** Claude Code

```
Parte B. La migración a PostgreSQL ya está hecha. No des el trabajo por terminado y no escribas todavía HALLAZGOS.md. Haz estas tres cosas y dime lo que veas, con la evidencia:

1. Corre la comprobación de tipos: (cd backend && npm run typecheck). Di si está en verde o en rojo y pega el error si lo hay.

2. Mira el diff de backend/database/schema.ts entre la rama de partida (s10/start o upstream/s10/start) y lo que hay ahora. Si hay cambios, di qué declaraciones han cambiado de tipo y de qué a qué. Si el diff sale vacío, busca qué fija esos tipos para que no cambien al cambiar de motor: vacío no quiere decir que no haya cambiado nada, quiere decir que lo que cambió no está en lo que el proyecto declara.

3. Busca cómo decide el proyecto si una tarea está vencida y léelo con lo que encontraste en el punto anterior delante. Hay un comentario en ese código que explica por qué la comparación funciona. Di si ese comentario sigue siendo verdad, y compruébalo con una tarea que ya debería estar vencida, no solo leyendo el comentario. Di qué tarea creaste, qué fecha tiene y qué devolvió la comparación.

No toques ninguna migración existente. No reescribas el esquema a mano.
```

**Qué salió:** typecheck en verde y diff de `schema.ts` vacío (`schema_rules.ts` fija `due_date` como `string`), pero `pg` entrega las columnas `date` como `Date` y `isOverdueOn` daba `false` siempre: una tarea con vencimiento 2026-10-01 salió `isOverdue: false` contra `today=2026-10-07`. El comentario ya no era verdad.

---

## Prompt 3

**Modelo:** Sonnet 5.5
**Herramienta:** Claude Code

```
Arréglalo con el parser de tipo date de pg
```

**Qué salió:** funcionó a la primera: `pg.types.setTypeParser(1082, ...)` en `config/database.ts`, `@types/pg` y un test nuevo (`tests/functional/tasks/overdue.spec.ts`) que falló antes y pasa después; 25/25 en verde.

---

## Prompt 4

**Modelo:** Sonnet 5.5
**Herramienta:** Claude Code

```
Parte C. Escribe HALLAZGOS.md. Una sola línea debajo de cada guion, con lo medido en esta sesión. No reescribas las migraciones ni el código.

1. Las filas que cambian y la rama. Mide con una consulta cuántas filas cambian de valor por este cambio de motor. Si ninguna migración reescribe datos, dilo tal cual y pon el número que devolvió la consulta. Di en qué rama del árbol de reversibilidad cae, clasificándolo por cómo se deshace, no por cómo está escrito.

2. Lo que la batería de pruebas no podía ver. Una línea concreta: antes del test de vencimiento, la suite no veía que pg entrega las columnas date como Date mientras schema.ts, fijado por schema_rules.ts, declara due_date como string, y por eso una tarea con vencimiento 2026-10-01 consultada el 2026-10-07 devolvía isOverdue false. Di qué buscaste y dónde (typecheck, diff de schema.ts, isOverdueOn).

3. Tu duda. Una línea sobre qué no quedó comprobado del todo. No inventes una duda genérica: usa lo que de verdad no se pudo cerrar en esta sesión (por ejemplo el arranque en frío de las dos bases, o si el parser del oid 1082 cubre todas las columnas date y no solo due_date).
```

**Qué salió:** funcionó a la primera, con un matiz: el árbol de reversibilidad no está en el repo, así que clasificó "por cómo se deshace" con sus palabras. Cerró el arranque en frío (down, up --wait, migrate, test: 25/25) y usó como duda los datos reales sin probar.

---

