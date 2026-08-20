## Why

FlowSync sabe hoy quién eres, pero no en qué anda nadie: la única pantalla con sesión iniciada es el perfil propio. Sin la lista compartida no hay dónde crear una tarea, dónde cambiarle el estado ni nada que enseñar, así que las épicas E2 y E3 están bloqueadas en su totalidad. Este change levanta el sustrato: una sola lista del espacio, crear con solo el título y cambiar el estado desde la propia fila.

Cubre cinco historias del backlog: `E3-1` (lista compartida), `E2-1` (crear con solo el título), `E2-2` (título obligatorio), `E2-3` (nace mía y pendiente) y `E2-4` (cambiar el estado desde la lista). Traza a RF-5, RF-6, RF-7, RF-8, RF-9, RF-16 y RF-17 del PRD.

## What Changes

**API (AdonisJS, `backend/`) — exactamente tres operaciones**

- `GET /api/v1/tasks` — devuelve todas las tareas del espacio, idénticas para cualquier persona autenticada, cada una con su responsable resuelto a nombre.
- `POST /api/v1/tasks` — crea una tarea. El `title` es el único campo que se acepta; la tarea nace en `pending` y con quien la crea como responsable.
- `PATCH /api/v1/tasks/:id` — actualiza `status` y/o `assigneeId` de cualquier tarea, sin importar de quién sea.
- Las tres exigen sesión: sin token válido, `401`.
- Estados como conjunto cerrado en la API: `pending`, `in_progress`, `done`. Cualquier otro valor se rechaza con `422`.
- Nueva tabla `tasks` (título, estado, responsable y marcas de tiempo) con clave foránea a `users`.

**Interfaz (React 19, `frontend/`)**

- Pantalla nueva `/tasks`, protegida, con la lista compartida: cada fila muestra título, nombre del responsable y estado.
- El estado se cambia desde la fila con un grupo de tres botones (Pendiente · En curso · Hecho), el actual marcado como activo. Un clic, sin diálogo ni campos.
- Crear una tarea es un único campo de título en la propia pantalla; la tarea aparece en la lista sin recargar ni navegar.
- Estado vacío que explica qué es la lista y ofrece crear la primera tarea, en lugar de una lista vacía sin más.
- El responsable se identifica por su **nombre**; si no tiene nombre puesto, se pinta «Sin nombre». Nunca su correo ni su id.
- Los estados se pintan en castellano (Pendiente, En curso, Hecho); los identificadores `pending`, `in_progress` y `done` no llegan nunca a la pantalla.

**BREAKING (comportamiento observable de la sesión)** — `/tasks` pasa a ser la pantalla de aterrizaje: al iniciar sesión y al abrir una dirección desconocida se llega a la lista, no al perfil. `/profile` sigue existiendo y se alcanza desde un enlace en la lista.

**Deliberadamente fuera de este change**

- **Sin fecha de vencimiento.** La tarea no la tiene y la lista no muestra fechas ni marcas de vencida. No se deja preparada.
- **Sin lectura individual de una tarea, sin borrado y sin endpoints de equipo.** La API tiene tres operaciones y solo tres.
- **Sin responsable, estado ni fecha en la creación.** El formulario no los ofrece ni los sugiere.
- **Sin tareas privadas ni vista «mis tareas».** Una sola lista compartida, y cualquiera puede cambiar el estado y el responsable de cualquier tarea.
- **Sin señales de presencia** ni de quién está conectado.
- **Sin reasignar desde la interfaz.** La API acepta `assigneeId` en la actualización, pero ninguna pantalla de este change lo expone.
- **Sin refresco automático** cuando otra persona cambia algo (historia `E3-2`, aparte).
- **Sin tests.** No se monta base de pruebas ni se escriben tests en este change.

## Capabilities

### New Capabilities
- `tasks`: la lista compartida del equipo — crear una tarea con solo el título, verla junto a las del resto con su responsable y su estado, y cambiar ese estado desde la propia fila. Cubre tanto la API como las pantallas.

### Modified Capabilities
- `auth`: cambia a dónde se llega con la sesión iniciada. Los escenarios «Con sesión hacia las pantallas de acceso» y «Dirección desconocida» del requisito *Pantallas protegidas según el estado de la sesión* llevaban al perfil y ahora llevan a la lista de tareas. El resto del requisito no cambia.

## Impact

**Backend**
- Nueva migración `create_tasks_table` → regenera `database/schema.ts` (autogenerado, no se edita a mano).
- Nuevos: `app/models/task.ts`, `app/controllers/tasks_controller.ts`, `app/validators/task.ts`, `app/transformers/task_transformer.ts`.
- `app/models/user.ts`: relación `hasMany` hacia tareas.
- `start/routes.ts`: grupo `tasks` bajo `/api/v1` con `middleware.auth()`.
- Código generado versionado que hay que commitear: `.adonisjs/server/controllers.ts` y `.adonisjs/client/registry/`.

**Frontend**
- Nuevos: `src/pages/tasks-page.tsx` y los componentes propios de la lista bajo `src/components/`.
- `src/lib/api.ts`: tres funciones nuevas y soporte de `PATCH` en el helper `request` (hoy solo admite `GET` y `POST`).
- `src/lib/types.ts`: tipos de tarea y del conjunto cerrado de estados.
- `src/routes/app-routes.tsx`: ruta `/tasks` y cambio del destino comodín.
- `src/routes/public-only-route.tsx`: destino al que se aparta a quien ya tiene sesión.
- Sin dependencias nuevas: se reutilizan `alert`, `button`, `card`, `input` y `label` de `src/components/ui/`, que es todo lo que hay generado.

**Sin impacto en**: autenticación y emisión de tokens, formato `{ data: ... }` del serializer, contrato de errores de VineJS.

## Puntos abiertos

Decisiones de producto que este change **no toma** y que quedan anotadas para que nadie dé la lista por completa:

- **En qué orden salen las tareas (PA-3).** No hay criterio de ordenación decidido, así que este change **no ordena la lista explícitamente**: no se inventa un orden ni se promete ninguno. La consecuencia es que el orden depende de lo que devuelva la base de datos y puede cambiar entre peticiones. Es también la ausencia más grave de `E3-1`: CA-5 promete enumerar el trabajo de cada persona, y sin orden ni agrupación esa promesa no se sostiene con volumen.
- **Cuánto es «demasiado largo» para un título (PA-9).** El umbral de producto sigue sin decidir. Este change fija 255 caracteres como **cota técnica de la columna**, no como decisión de producto, y avisa con `422` en lugar de recortar en silencio. Cuando el umbral se decida, se ajusta.
- **Qué transiciones son legales y si se puede volver atrás desde «Hecho» (PA-7).** Este change permite ir de cualquier estado a cualquiera de los tres, que es lo que CA-3 de `E2-4` describe. Si se decide un grafo de transiciones, habrá que restringirlo.
- **Cuántas tareas «En curso» puede acumular una persona (PA-4).** Sin límite en este change.
- **Qué ve alguien cuando la tarea que mira cambia bajo sus pies (PA-8).** Fuera de alcance junto con el refresco automático.
