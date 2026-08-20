import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * El título es lo único que se pide. No hay ni se sugiere responsable, estado
 * ni fecha: la tarea nace en «Pendiente» y a nombre de quien la escribe.
 */
export function NewTaskForm({
  title,
  isSubmitting,
  error,
  onTitleChange,
  onSubmit,
}: {
  title: string
  isSubmitting: boolean
  error?: string
  onTitleChange: (title: string) => void
  onSubmit: () => void
}) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2" noValidate>
      <Label htmlFor="task-title">Nueva tarea</Label>
      <div className="flex gap-2">
        <Input
          id="task-title"
          name="title"
          placeholder="¿En qué vas a trabajar?"
          autoComplete="off"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'task-title-error' : undefined}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear'}
        </Button>
      </div>
      <FieldError id="task-title-error" message={error} />
    </form>
  )
}
