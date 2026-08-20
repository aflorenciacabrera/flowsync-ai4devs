import { Button } from '@/components/ui/button'
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/types'

/**
 * Los tres estados siempre a la vista, con el actual marcado. Un clic cambia:
 * sin desplegar, sin diálogo y sin rellenar nada.
 *
 * No es un `<select>` a propósito: esconder los destinos hasta abrirlo cuesta
 * una interacción de más y la historia pide ver a qué se puede cambiar.
 */
export function TaskStatusGroup({
  current,
  taskTitle,
  disabled,
  onChange,
}: {
  current: TaskStatus
  taskTitle: string
  disabled?: boolean
  onChange: (status: TaskStatus) => void
}) {
  return (
    <div
      role="group"
      aria-label={`Estado de «${taskTitle}»`}
      className="flex flex-wrap gap-1"
    >
      {TASK_STATUSES.map((status) => {
        const isCurrent = status === current

        return (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={isCurrent ? 'default' : 'outline'}
            aria-pressed={isCurrent}
            disabled={disabled}
            // Volver a pulsar el estado que ya tiene no es un cambio: ahorra
            // una petición que el backend aceptaría sin hacer nada.
            onClick={() => !isCurrent && onChange(status)}
          >
            {TASK_STATUS_LABELS[status]}
          </Button>
        )
      })}
    </div>
  )
}
