import { TaskStatusGroup } from '@/components/task-status-group'
import type { Task, TaskStatus } from '@/lib/types'

/**
 * Una fila responde las tres preguntas sin abrir nada: qué es, quién lo lleva
 * y en qué estado está.
 *
 * Deliberadamente no muestra fechas ni marca de vencida (la tarea no tiene
 * vencimiento), ni el email o el id del responsable, ni forma de reasignar.
 */
export function TaskRow({
  task,
  isUpdating,
  onStatusChange,
}: {
  task: Task
  isUpdating: boolean
  onStatusChange: (status: TaskStatus) => void
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium break-words">{task.title}</p>
        <p className="text-muted-foreground text-sm">
          {/* Nunca el correo ni el id: si no hay nombre puesto, «Sin nombre». */}
          {task.assignee.fullName ?? 'Sin nombre'}
        </p>
      </div>

      <TaskStatusGroup
        current={task.status}
        taskTitle={task.title}
        disabled={isUpdating}
        onChange={onStatusChange}
      />
    </li>
  )
}
