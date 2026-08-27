# Capability: tasks

La lista de trabajo del equipo: una sola lista compartida, la misma para cualquier cuenta, donde crear una tarea cuesta escribir un título y donde el responsable, el estado y —al abrir la tarea— su fecha de vencimiento se leen sin preguntarle a nadie.

El comportamiento exigible de esta capability vive en **[`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md)**: es la fuente de verdad. Este README no repite esas reglas — solo enlaza a ellas — para que no haya dos sitios donde puedan desincronizarse; ver [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md).

## Endpoints

Todos bajo `/api/v1/tasks`, protegidos por el guard `api` (`Authorization: Bearer <token>`; `.use(middleware.auth())` en `backend/start/routes.ts`).

| Método | Ruta | Controlador | Query / Body | Respuesta |
|---|---|---|---|---|
| `GET` | `/api/v1/tasks` | `TasksController.index` | `status` (opcional, uno de `pending`/`in_progress`/`done`) | Lista de tareas, forma "resumen" (sin fecha de vencimiento) |
| `POST` | `/api/v1/tasks` | `TasksController.store` | body `{ "title": string }` | `201` con la tarea creada, forma "resumen" |
| `GET` | `/api/v1/tasks/:id` | `TasksController.show` | `today` (obligatorio, `AAAA-MM-DD`) | Tarea completa, forma "detalle" |
| `PATCH` | `/api/v1/tasks/:id/status` | `TaskStatusesController.update` | body `{ "status": string }` | Tarea actualizada, forma "resumen" |
| `PUT` | `/api/v1/tasks/:id/due-date` | `TaskDueDatesController.update` | body `{ "today": string, "dueDate": string \| null }` | Tarea actualizada, forma "detalle" |

Dos formas de tarea, por transformer (`backend/app/transformers/`):

- **Resumen** (`TaskTransformer`, usado por la lista y por crear/cambiar estado): `id`, `title`, `status`, `createdAt`, `updatedAt`, `assignee`.
- **Detalle** (`TaskDetailTransformer`, usado por `GET /:id` y por `PUT /:id/due-date`): lo mismo más `dueDate` e `isOverdue`. Por eso esos dos endpoints exigen `today` y los otros tres no.

En ambas formas, `assignee` sale de `TaskAssigneeTransformer`: solo `id`, `fullName` e `initials` — nunca el email ni ningún otro dato de la cuenta.

## Reglas de negocio

Están todas en [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md), agrupadas por requisito con sus escenarios. Como índice, sin repetir el contenido:

- Alta de una tarea: título obligatorio, límite de 200 caracteres, responsable y estado los pone el sistema.
- La lista compartida: alcance por defecto, orden, qué se ve del responsable.
- Los tres estados fijos y su cambio.
- Fecha de vencimiento: fijarla, cambiarla, retirarla, y cuándo una tarea cuenta como vencida.
- Acotar la lista por estado.
- Consulta de una tarea suelta.
- Requisitos de interfaz (pantallas, controles, avisos) — no tienen equivalente en esta API; son comportamiento del frontend descrito en la misma spec.

Los tres changes archivados en `openspec/changes/archive/` (`add-task-list`, `add-task-status-filter`, `add-task-due-date`) explican, en su `proposal.md`, el porqué de varias de esas reglas — por ejemplo, por qué el límite del título es 200 y no otro número.

## Cómo se prueba en local

```bash
cd backend
node ace test functional --files=assignee # --files filtra por nombre de fichero, no de carpeta
node ace test functional                 # toda la suite functional (auth + tasks)
```

Hoy la cobertura es parcial: `backend/tests/functional/tasks/` solo tiene `assignee.spec.ts`, que cubre el requisito *Lo que cada tarea muestra de su responsable*. El resto del comportamiento descrito en la spec no tiene todavía un test de integración.

Para probar a mano contra el servidor real:

```bash
node ace serve --hmr   # backend/, escucha en http://localhost:3333
```

Todas las rutas de tareas exigen sesión: primero `POST /api/v1/auth/signup` o `/auth/login` para conseguir un token, y mandarlo en `Authorization: Bearer <token>` en cada petición a `/api/v1/tasks*`. `GET /api/v1/tasks/:id` y `PUT /api/v1/tasks/:id/due-date` exigen además `?today=AAAA-MM-DD`.

Ojo con la base de datos: las suites `functional` pegan contra el mismo `tmp/db.sqlite3` que usa `node ace serve` (ver `CLAUDE.md`). Los tests de esta capability aíslan sus escrituras con `testUtils.db().withGlobalTransaction()`.
