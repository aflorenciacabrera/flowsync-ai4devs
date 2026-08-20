/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/**
 * Los tres estados, con los identificadores que viajan por la API. Es un
 * conjunto cerrado: el backend rechaza con 422 cualquier otro valor.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

/**
 * Cómo se lee cada estado en pantalla. Los identificadores en inglés no se
 * pintan nunca: todo lo visible sale de este mapa.
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/**
 * Espejo de `TaskTransformer` del backend (app/transformers/task_transformer.ts).
 * Del responsable solo llegan `id` y `fullName`: ni su email ni sus iniciales.
 * La tarea no tiene fecha de vencimiento.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: { id: number; fullName: string | null }
  createdAt: string
  updatedAt: string
}

export type CreateTaskPayload = {
  title: string
}

/** Al menos uno de los dos: el backend responde 422 si no llega ninguno. */
export type UpdateTaskPayload = {
  status?: TaskStatus
  assigneeId?: number
}
