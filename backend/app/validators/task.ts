import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task_status'

/**
 * El título es lo único que una tarea necesita para existir. Se recorta antes
 * de medirlo, de modo que un valor con solo espacios falla por vacío en vez de
 * colarse como título en blanco, y lo que se guarda ya viene sin extremos.
 *
 * Los 255 son la cota de la columna, no una decisión de producto: el umbral
 * real sigue abierto (PA-9). Lo que sí está decidido es que pasarse avisa con
 * un 422 y nunca guarda una versión recortada.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * VineJS descarta en silencio las claves que el schema no declara. Como la
 * historia exige que indicar responsable, estado o fecha de vencimiento se
 * **rechace** y no simplemente se ignore, se declaran y se prohíben.
 *
 * Prohibir `dueDate` no es dejarla preparada: es lo contrario. La tarea no
 * tiene fecha de vencimiento, y enviarla tiene que fallar de forma visible.
 */
const prohibited = vine.createRule((value, _options: undefined, field) => {
  if (value !== undefined && value !== null) {
    field.report('El campo {{ field }} no se puede indicar', 'prohibited', field)
  }
})

const prohibitedField = () => vine.any().optional().use(prohibited())

/**
 * Alta de una tarea: solo el título. El estado de nacimiento y el responsable
 * los pone el servidor, nunca el cliente.
 */
export const createTaskValidator = vine.create({
  title: title(),
  status: prohibitedField(),
  assigneeId: prohibitedField(),
  dueDate: prohibitedField(),
})

/**
 * Actualización: estado, responsable o ambos, sobre cualquier tarea sea de
 * quien sea. `requiredIfMissing` cruzado es lo que impide un cuerpo vacío:
 * si no llega ninguno de los dos, los dos se reclaman y la respuesta es 422.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional().requiredIfMissing('assigneeId'),
  assigneeId: vine
    .number()
    .exists({ table: 'users', column: 'id' })
    .optional()
    .requiredIfMissing('status'),
  dueDate: prohibitedField(),
})
