## 1. Modelo de datos

- [x] 1.1 Crear la migración `create_tasks_table` con `id`, `title` (string 255, no nulo), `status` (string, no nulo, por defecto `pending`), `assignee_id` (entero no nulo, clave foránea a `users.id`) y las marcas `created_at` / `updated_at`. Sin columna de fecha de vencimiento.
- [x] 1.2 Ejecutar `node ace migration:run` y comprobar que `database/schema.ts` se regenera con la clase `TaskSchema`. No editar ese fichero a mano.
- [x] 1.3 Estrechar el tipo del estado desde `database/schema_rules.ts` con `tables.tasks.columns.status.tsType`, volver a generar y verificar que el esquema expone la unión de los tres literales. Si el generador no lo respeta, aplicar el plan B de `design.md` (riesgo 1) y anotarlo.
- [x] 1.4 Crear `app/models/task.ts` extendiendo `TaskSchema`, con la relación `belongsTo` hacia `User`, y exportar la tupla de estados como fuente única.
- [x] 1.5 Añadir en `app/models/user.ts` la relación `hasMany` hacia `Task`, sin tocar nada más del modelo.

## 2. Validación

- [x] 2.1 Crear `app/validators/task.ts` con `createTaskValidator`: solo `title`, con `.trim()` antes de `minLength(1)` y `maxLength(255)`.
- [x] 2.2 Declarar `status`, `assigneeId` y `dueDate` como prohibidos, para que enviarlos devuelva `422` con su `field` en lugar de descartarse en silencio. `dueDate` va también en la actualización: la spec exige que enviar una fecha de vencimiento falle de forma visible, no que se ignore.
- [x] 2.3 Añadir `updateTaskValidator` con `status` (enum de la tupla del modelo) y `assigneeId` (`.exists({ table: 'users', column: 'id' })`), ambos opcionales.
- [x] 2.4 Exigir en la actualización que llegue al menos uno de los dos campos, devolviendo `422` cuando el cuerpo no cambie nada.

## 3. API

- [x] 3.1 Crear `app/transformers/task_transformer.ts` que devuelva `id`, `title`, `status`, `createdAt`, `updatedAt` y un `assignee` anidado con exactamente `id` y `fullName`. No reutilizar `UserTransformer`: expone `email` e `initials`, que no deben salir.
- [x] 3.2 Crear `app/controllers/tasks_controller.ts` con `index`, que carga todas las tareas con `preload('assignee')` y las devuelve vía `serialize()`. **Sin `orderBy`**, con un comentario que explique que la ausencia es deliberada (PA-3) y no un descuido.
- [x] 3.3 Añadir `store`: valida, crea con `status` en `pending` y `assigneeId` igual a la cuenta autenticada, y responde `201` con la tarea ya transformada y su `assignee` cargado.
- [x] 3.4 Añadir `update`: `findOrFail` sobre el id de la ruta (el `404` sale solo), aplica los campos validados y responde `200` con la tarea actualizada.
- [x] 3.5 Registrar en `start/routes.ts` el grupo `tasks` bajo `/api/v1` con `middleware.auth()`: `GET /tasks`, `POST /tasks` y `PATCH /tasks/:id`. No declarar `show` ni `destroy`.
- [x] 3.6 Comprobar con `node ace list:routes` que la capacidad expone esas tres rutas y ninguna más.
- [x] 3.7 Verificar a mano contra el servidor de desarrollo los rechazos que la spec exige: sin título, título en blanco, título de más de 255, estado fuera del conjunto, `assigneeId` inexistente, `status`/`assigneeId` en la creación, cuerpo de actualización vacío, tarea inexistente y las tres operaciones sin token.

## 4. Cliente de API en el frontend

- [x] 4.1 Añadir en `src/lib/types.ts` la tupla de estados como fuente única, el tipo `Task` (con `assignee: { id, fullName }`) y el mapa de estado a etiqueta en castellano (Pendiente · En curso · Hecho).
- [x] 4.2 Ampliar el tipo `method` del helper `request` de `src/lib/api.ts` con `'PATCH'`.
- [x] 4.3 Añadir `listTasks`, `createTask` y `updateTask` en `src/lib/api.ts`, siguiendo el patrón de las existentes: token, desenvolver `{ data }`, devolver el payload.
- [x] 4.4 Añadir `title: 'el título'` a `FIELD_LABELS` para que los mensajes de `minLength` y `maxLength` salgan bien redactados.

## 5. Pantalla de la lista

- [x] 5.1 Crear el componente del grupo de estados: tres `Button` con el activo en `variant="default"`, los otros en `outline`, `aria-pressed` en cada uno y el grupo con `role="group"` y una etiqueta que nombre la tarea.
- [x] 5.2 Crear el componente de fila: título, nombre del responsable con «Sin nombre» cuando `fullName` sea `null`, y el grupo de estados. Sin fechas ni marcas de vencida, sin email ni id del responsable, sin control para reasignar.
- [x] 5.3 Crear el formulario de creación: un único campo de título con su `Label`, su `FieldError` y el botón de envío. Ningún control ni sugerencia de responsable, estado o fecha.
- [x] 5.4 Crear `src/pages/tasks-page.tsx`: carga la lista al montar, guarda las tareas en `useState`, y compone cabecera, formulario y filas con los componentes de `src/components/ui/` que ya existen.
- [x] 5.5 Añadir el estado vacío: cuando no hay ninguna tarea, explicar qué es la lista e invitar a crear la primera, en lugar de una zona vacía.
- [x] 5.6 Enganchar la creación con `useAuthForm(['title'])`: envío deshabilitado mientras dura, la tarea nueva se añade a la lista sin recargar ni navegar, y el campo queda vacío para la siguiente.
- [x] 5.7 Enganchar el cambio de estado con actualización optimista: la fila cambia en el acto, los tres botones de esa fila quedan deshabilitados mientras la petición está en vuelo, y si falla la fila vuelve al estado real y se avisa con `Alert`.
- [x] 5.8 Añadir en la cabecera el enlace a `/profile`, que sigue siendo la única salida hacia el cierre de sesión.
- [x] 5.9 Repasar la pantalla y confirmar que ningún texto visible contiene `pending`, `in_progress` ni `done`.

## 6. Rutas y aterrizaje

- [x] 6.1 Registrar `/tasks` en `src/routes/app-routes.tsx` dentro de `ProtectedRoute`, junto a `/profile`.
- [x] 6.2 Cambiar el destino del comodín `*` de `/profile` a `/tasks`.
- [x] 6.3 Cambiar el destino de `PublicOnlyRoute` de `/profile` a `/tasks`, y ajustar el comentario del fichero, que hoy dice que se rebota al perfil.
- [ ] 6.4 Comprobar los cuatro caminos: iniciar sesión, registrarse, abrir una dirección desconocida y abrir `/tasks` sin sesión.

## 7. Cierre

- [ ] 7.1 Pasar `npm run lint`, `npm run format` y `npm run typecheck` en `backend/`.
- [ ] 7.2 Pasar `npm run lint`, `npm run format` y `npm run build` en `frontend/` (el typecheck vive dentro del build).
- [ ] 7.3 Arrancar el servidor de desarrollo del backend para regenerar `.adonisjs/server/controllers.ts` y `.adonisjs/client/registry/`, y commitear ese diff.
- [ ] 7.4 Recorrer las cinco historias de punta a punta con dos cuentas distintas: crear con solo el título, ver la misma lista desde ambas, cambiar el estado de una tarea ajena y comprobar que ninguna de las dos ve fechas, correos ni identificadores.
