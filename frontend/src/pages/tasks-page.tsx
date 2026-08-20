import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { NewTaskForm } from '@/components/new-task-form'
import { TaskRow } from '@/components/task-row'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'

const FIELDS = ['title'] as const

type LoadStatus = 'loading' | 'ready' | 'error'

export function TasksPage() {
  const { token, user } = useAuth()
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  // Tareas con un cambio de estado en vuelo: sus botones quedan bloqueados
  // para que no se encadenen clics que se resuelvan desordenados.
  const [updatingIds, setUpdatingIds] = useState<number[]>([])
  const [updateError, setUpdateError] = useState<string | null>(null)

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((loaded) => {
        if (cancelled) return
        setTasks(loaded)
        setLoadStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No hemos podido cargar las tareas.',
        )
        setLoadStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreate = useCallback(() => {
    if (!token) return

    // Se comprueba aquí para no gastar una petición en algo que el backend
    // rechazaría igual; el mensaje sale bajo el campo, no en el aviso de arriba.
    const trimmed = title.trim()
    if (!trimmed) {
      failWith('title', 'Escribe un título para la tarea.')
      return
    }

    return submit(async () => {
      const created = await api.createTask(token, { title: trimmed })
      // Aparece en la lista sin recargar ni navegar, y el campo queda libre
      // para apuntar lo siguiente.
      setTasks((current) => [...current, created])
      setTitle('')
      // Si la carga inicial había fallado, seguiríamos enseñando el error y la
      // tarea recién creada no se vería. Una creación correcta demuestra que el
      // servidor responde, así que la lista pasa a mostrarse.
      setLoadStatus('ready')
      setLoadError(null)
    })
  }, [failWith, submit, title, token])

  const handleStatusChange = useCallback(
    async (task: Task, status: TaskStatus) => {
      if (!token) return

      const previous = task.status
      setUpdateError(null)
      setUpdatingIds((current) => [...current, task.id])
      // Optimista: la fila cambia en el acto y la petición va en paralelo.
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status } : item,
        ),
      )

      try {
        const updated = await api.updateTask(token, task.id, { status })
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? updated : item)),
        )
      } catch (error: unknown) {
        // Si el servidor no lo confirma, la fila vuelve a la verdad.
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, status: previous } : item,
          ),
        )
        setUpdateError(
          error instanceof ApiError
            ? `No se pudo cambiar el estado de «${task.title}». ${error.message}`
            : `No se pudo cambiar el estado de «${task.title}».`,
        )
      } finally {
        setUpdatingIds((current) => current.filter((id) => id !== task.id))
      }
    },
    [token],
  )

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Tareas del equipo</h1>
            <p className="text-muted-foreground truncate text-sm">
              {user?.fullName ?? 'Sin nombre'}
            </p>
          </div>
          {/* El perfil es la única salida hacia el cierre de sesión: aquí solo
              se enlaza, no se ofrece cerrar sesión desde la lista. */}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/profile">Mi perfil</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Todo lo que lleva el equipo</CardTitle>
            <CardDescription>
              Una sola lista, la misma para todos. Cualquiera puede cambiar el
              estado de cualquier tarea.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <NewTaskForm
              title={title}
              isSubmitting={isSubmitting}
              error={fieldErrors.title}
              onTitleChange={setTitle}
              onSubmit={handleCreate}
            />

            {(formError || updateError) && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{formError ?? updateError}</AlertDescription>
              </Alert>
            )}

            {loadStatus === 'loading' && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Cargando tareas…
              </p>
            )}

            {loadStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}

            {loadStatus === 'ready' && tasks.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                <p className="text-foreground font-medium">
                  Aquí va todo lo que lleva el equipo.
                </p>
                <p className="mt-1">
                  Todavía no hay ninguna tarea. Escribe un título arriba y crea
                  la primera.
                </p>
              </div>
            )}

            {loadStatus === 'ready' && tasks.length > 0 && (
              // Sin ordenar: se pintan en el orden en que llegan. No hay
              // criterio de orden decidido (PA-3) y no se inventa aquí.
              <ul className="divide-y rounded-md border">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isUpdating={updatingIds.includes(task.id)}
                    onStatusChange={(status) =>
                      handleStatusChange(task, status)
                    }
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
