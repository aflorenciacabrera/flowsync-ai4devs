## Context

Ver `proposal.md` — Why. Lo que condiciona el diseño es el estado real del repo:

- **El esquema se genera.** `database/schema.ts` sale de las migraciones (`schemaGeneration.enabled`) y no se edita. Los modelos no declaran columnas: extienden la clase generada. Las reglas de tipado viven en `database/schema_rules.ts`, hoy vacío (`{} satisfies SchemaRules`).
- **Toda respuesta pasa por `serialize()`** y por un transformer de `app/transformers/`. Ningún controlador devuelve modelos crudos.
- **El registro de controladores y el registro Tuyau están versionados** en `backend/.adonisjs/`. Añadir un controlador o una ruta produce diff que hay que commitear.
- **La API es el único punto de contacto del frontend**: todo pasa por `src/lib/api.ts`, que ya traduce los errores de VineJS a castellano y los reparte por campo.
- **`src/components/ui/` tiene exactamente cinco componentes**: `alert`, `button`, `card`, `input`, `label`. No hay select, dropdown, table ni badge, y este change no añade dependencias — así que todo lo que haga falta se compone con esos cinco más Tailwind.
- **El stack va por delante de la documentación conocida** (AdonisJS 7, Lucid 22, VineJS 4, TS 6). Las firmas se comprueban en los `.d.ts` de `node_modules`, no de memoria.

## Goals / Non-Goals

**Goals:**
- Que el conjunto cerrado de estados tenga **una sola definición por lado** (una en el backend, una en el frontend) y que todo lo demás la derive, en lugar de repetir los tres literales por el código.
- Que la lista se sirva con **una sola consulta**, sin una petición por responsable.
- Que el responsable viaje recortado desde el propio transformer, no filtrado en el cliente.
- Que cambiar de estado se sienta instantáneo sin mentir: si el servidor rechaza, la fila vuelve a la verdad.

**Non-Goals:**
- No se toca la autenticación ni el formato `{ data }` del serializer.
- No se introduce gestión de estado de servidor (react-query o similar): sería una dependencia nueva.
- No se monta base de pruebas. `tests/unit/` y `tests/functional/` siguen sin existir después de este change.

## Decisions

### 1. Los estados: `vine.enum` como puerta, `schema_rules.ts` para el tipo

El gate real que produce el `422` es **VineJS** (`vine.enum(['pending', 'in_progress', 'done'])`), tanto al crear como al actualizar. Es el único punto por el que entra un estado.

La columna se declara como `table.string('status').notNullable().defaultTo('pending')` y se estrecha su tipo generado desde `database/schema_rules.ts`, que admite `tables.tasks.columns.status.tsType`. Así el modelo generado expone `status: 'pending' | 'in_progress' | 'done'` sin que nadie edite `database/schema.ts`.

*Alternativa descartada:* `table.enum('status', [...])`. En SQLite knex lo traduce a un `varchar` con un `check`, lo que añade defensa a nivel de base de datos, pero el generador de esquema de Lucid 22 es reciente y no está verificado cómo tipa esa columna. La constraint no aporta nada que el validador no cubra ya, y sí puede pelearse con la generación. Si al implementar se comprueba que el generador la maneja bien, es una mejora que se puede recuperar sin cambiar la spec.

*Fuente única:* la tupla de estados se declara una vez en el backend (junto al modelo, exportada) y el validador la consume. En el frontend se declara una vez en `src/lib/types.ts` con su mapa a las etiquetas en castellano; ese mapa es también lo que recorre la fila para pintar los tres botones, de modo que no hay ninguna lista de estados escrita a mano en un componente.

### 2. `assignee` anidado y recortado en el transformer

`TaskTransformer` devuelve `assignee: { id, fullName }` — nada más. No reutiliza `UserTransformer`, que expone `email` e `initials`: la lista no los necesita y, una vez que el cliente los recibe, ya no se recortan sin romperlo. El backlog señala justo este punto como el delicado de la historia.

El controlador hace `preload('assignee')` sobre la consulta de la lista: una consulta para tareas y otra para los responsables, no una por fila.

*Alternativa descartada:* devolver `assigneeId` plano y que el cliente resuelva el nombre. Obligaría a un endpoint de miembros, que la restricción de alcance prohíbe.

### 3. Un solo `TasksController` con `index`, `store` y `update`

Tres métodos, tres rutas, nada más. No hay `show` ni `destroy`: no se declaran, y `GET /api/v1/tasks/:id` o `DELETE` caen en el 404 por defecto del router, que es exactamente el comportamiento que la spec exige.

`update` usa `Task.findOrFail(params.id)` — el `E_ROW_NOT_FOUND` de Lucid produce el `404` sin código extra.

### 4. `201 Created` al crear, frente al `200` de `signup`

`POST /api/v1/tasks` responde `201`. Es el código correcto para una creación y lo que el cliente espera de un recurso nuevo.

Queda una inconsistencia conocida con `POST /api/v1/auth/signup`, que responde `200` y está así fijado en la spec de `auth`. Se acepta a sabiendas: alinear los dos significaría o bien romper un contrato ya escrito, o bien propagar el código menos correcto. Si molesta, la corrección natural es un change aparte que lleve `signup` a `201`.

### 5. Validadores separados para crear y actualizar

`createTaskValidator` acepta **solo** `title`. VineJS descarta por defecto las claves desconocidas, lo que dejaría pasar en silencio un `status`, un `assigneeId` o un `dueDate` enviados por el cliente — y la spec exige `422` en los tres casos. Así que los tres se declaran explícitamente como prohibidos mediante una regla `prohibited` propia (`vine.createRule`), para que el rechazo sea observable en lugar de un descarte mudo. `dueDate` se prohíbe también en la actualización: la tarea no tiene fecha de vencimiento y enviar una tiene que fallar a la vista, que es lo contrario de dejarla preparada.

`updateTaskValidator` declara `status` y `assigneeId` opcionales, con una comprobación de que llega al menos uno. `assigneeId` lleva `.exists({ table: 'users', column: 'id' })`, que produce el `422` con `rule: 'database.exists'` cuando la cuenta no existe.

El `title` se normaliza con `.trim()` **antes** de `minLength(1)` y `maxLength(255)`, de modo que `"   "` falla por vacío y el título se guarda ya sin los extremos.

### 6. La lista no se ordena

No hay `.orderBy()` en la consulta. Es una decisión deliberada, no un olvido: no hay criterio de orden decidido (PA-3) y este change no inventa uno. La consecuencia es que el orden lo decide el motor y puede variar; la spec lo declara explícitamente para que ningún consumidor se apoye en él.

Esto merece un comentario en el propio código junto a la consulta. Sin él, el primer lector lo lee como un descuido y añade un `orderBy` que nadie ha decidido.

### 7. El control de estado: tres `Button` por fila

Cada fila pinta los tres estados como botones. El activo usa `variant="default"` y los otros dos `variant="outline"`; el activo lleva `aria-pressed` para que un lector de pantalla sepa cuál está puesto, y el grupo va en un contenedor con `role="group"` y una etiqueta que nombra la tarea. Un clic cambia el estado: sin desplegar, sin confirmar, sin campos.

*Alternativa descartada:* un `<select>` nativo. No añadiría dependencia, pero son dos interacciones y esconde los destinos hasta desplegarlo, cuando la historia pide que se vea a qué se puede cambiar.

*Alternativa descartada:* `npx shadcn@latest add select`. Arrastra `@radix-ui/react-select` al `package.json`, y este change no añade dependencias.

### 8. Estado optimista con vuelta atrás

Al pulsar, la fila cambia en el acto y la petición sale en paralelo. Si falla, la fila vuelve al estado que tenía y aparece un aviso. Es lo que pide el escenario de «el cambio no se puede confirmar» y lo que hace que el gesto se sienta como pide RF-9.

Mientras la petición está en vuelo, los tres botones de **esa** fila quedan deshabilitados: evita encadenar clics que se resuelvan desordenados y dejen la fila mostrando un estado que no es el guardado.

*Alternativa descartada:* esperar la respuesta antes de repintar. Es más simple y no puede desincronizarse, pero mete una latencia visible en el gesto que la historia quiere que cueste nada.

### 9. El estado de la lista vive en la página, con `useState`

`TasksPage` guarda el array de tareas, lo carga al montar y lo actualiza tras crear o cambiar un estado. No hay contexto ni store: una sola pantalla lo consume y no hay refresco automático en este change (es `E3-2`).

Se reutiliza `useAuthForm(['title'])` para el formulario de creación: gestiona ya el envío en curso y el reparto de errores entre el aviso general y el campo, que es exactamente lo que la spec pide. Su nombre y su ubicación en `src/auth/` son engañosos para este uso, pero duplicar la lógica lo sería más. Un movimiento a `src/lib/` o `src/hooks/` es limpieza para otro change, no para este.

### 10. `src/lib/api.ts` gana `PATCH` y tres funciones

El helper `request` hoy tipa `method` como `'GET' | 'POST'`; se amplía con `'PATCH'`. Se añaden `listTasks`, `createTask` y `updateTask`, todas con `token`, siguiendo el patrón de las existentes (desenvolver `{ data }`, devolver el payload).

`FIELD_LABELS` gana `title: 'el título'` para que los mensajes de `translate()` salgan bien redactados; `minLength` y `maxLength` ya están cubiertos y producen la frase correcta sin tocar nada más.

### 11. El aterrizaje se mueve a `/tasks`

`PublicOnlyRoute` redirige a `/tasks` en vez de a `/profile`, y el comodín `*` de `app-routes.tsx` hace lo mismo. `/profile` sigue existiendo tal cual, alcanzable desde un enlace en la cabecera de la lista, y sigue siendo el único sitio desde el que se cierra sesión.

Esto cambia comportamiento ya especificado de `auth`, por eso el change lleva un delta `MODIFIED` sobre esa capacidad además del delta nuevo de `tasks`.

## Risks / Trade-offs

- **El generador de esquema puede no respetar el `tsType` de `schema_rules.ts` como se espera** (API reciente, poco documentada) → si no funciona, el modelo declara el tipo del estado por su cuenta mediante un getter o un cast acotado en el transformer, y el validador sigue siendo la puerta real. El comportamiento observable no cambia en ningún caso, así que la spec no se ve afectada.

- **El estado optimista puede desincronizarse** si dos personas cambian la misma tarea a la vez: quien no refresque seguirá viendo su versión. Es la contrapartida conocida de no tener refresco automático → acotado: la vuelta atrás cubre el fallo del servidor, y el desajuste entre personas es exactamente lo que resuelve `E3-2`.

- **La lista sin orden se degrada con volumen.** Con las 200 tareas que contempla el PRD, «responder quién está en qué» recorriendo una lista sin orden ni agrupación no se sostiene → asumido y anotado como el punto abierto principal (PA-3). No se mitiga aquí porque cualquier orden sería una decisión de producto inventada.

- **Sin tests, la regresión no tiene red.** El conjunto cerrado de estados, el trim del título y el recorte del responsable son justo el tipo de cosa que se rompe en silencio → asumido por decisión explícita de alcance. Los escenarios de la spec quedan escritos y son directamente traducibles a tests functional cuando se monte la suite.

- **Los ficheros generados de `.adonisjs/` se olvidan fácil.** Si no se regeneran y commitean, un clon limpio no compila → mitigado con un paso explícito al final de `tasks.md`.

## Migration Plan

1. `node ace migration:run` crea la tabla y regenera `database/schema.ts`.
2. Nada que migrar: la tabla nace vacía y ninguna funcionalidad existente depende de ella.
3. Vuelta atrás: `node ace migration:rollback` la elimina. El único cambio que sobrevive fuera de la tabla es el destino del aterrizaje en el frontend, que se revierte con el propio código.
