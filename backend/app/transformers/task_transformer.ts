import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Del responsable sale su nombre y nada más.
 *
 * Deliberadamente **no** reutiliza `UserTransformer`: ese expone `email` e
 * `initials`, y la lista no los necesita. Una vez que el cliente los recibe ya
 * no se recortan sin romperlo, así que el recorte se hace aquí.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assignee: this.pick(this.resource.assignee, ['id', 'fullName']),
    }
  }
}
