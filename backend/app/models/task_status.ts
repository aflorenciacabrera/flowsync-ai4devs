/**
 * Fuente única de los tres estados de una tarea.
 *
 * Vive en su propio módulo, sin importar nada, porque `database/schema.ts`
 * (generado) lo importa para tipar la columna `status`: si estuviera en
 * `app/models/task.ts`, que a su vez extiende el esquema generado, habría ciclo.
 *
 * Los identificadores son estos y solo estos. Las etiquetas en castellano
 * (Pendiente · En curso · Hecho) son cosa de la interfaz, no de la API.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const DEFAULT_TASK_STATUS: TaskStatus = 'pending'
