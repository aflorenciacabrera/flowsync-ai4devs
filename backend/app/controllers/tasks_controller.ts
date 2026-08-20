import Task from '#models/task'
import TaskTransformer from '#transformers/task_transformer'
import { DEFAULT_TASK_STATUS } from '#models/task_status'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  /**
   * Una sola lista, la misma para todos: no se filtra por quién pregunta.
   */
  async index({ serialize }: HttpContext) {
    // Sin `orderBy` a propósito. No hay criterio de orden decidido (PA-3 del
    // PRD) y este change no inventa uno: la spec declara explícitamente que la
    // respuesta no promete ningún orden. No añadas uno sin esa decisión.
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  /**
   * El título es lo único que se acepta: la tarea nace en «pendiente» y con
   * quien la crea como responsable.
   */
  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    const task = await Task.create({
      title,
      status: DEFAULT_TASK_STATUS,
      assigneeId: user.id,
    })
    await task.load('assignee')

    // `serialize()` es asíncrono, así que se fija el código y se devuelve el
    // resultado por el mismo camino que el resto: pasárselo a `response.created()`
    // enviaría la promesa sin resolver.
    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  /**
   * Cualquiera cambia el estado y el responsable de cualquier tarea: no hay
   * roles ni permisos de por medio, ni transiciones prohibidas.
   */
  async update({ params, request, serialize }: HttpContext) {
    // `findOrFail` lanza E_ROW_NOT_FOUND, que el manejador de excepciones
    // traduce al 404 que pide la spec.
    const task = await Task.findOrFail(params.id)
    const { status, assigneeId } = await request.validateUsing(updateTaskValidator)

    // Se aplica campo a campo en vez de con `merge(payload)`: el payload trae
    // también las claves prohibidas y las opcionales ausentes, y ninguna de las
    // dos debe llegar al modelo.
    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
