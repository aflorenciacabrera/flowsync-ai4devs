import Task from '#models/task'
import { test } from '@japa/runner'

/**
 * Los bordes de `Task.isOverdueOn`, la única definición de «vencida» del
 * sistema: hay fecha, esa fecha es anterior al día de referencia, y la tarea
 * no está hecha.
 *
 * Sin servidor, sin base de datos y sin HTTP: la tarea se construye en memoria
 * con `new Task()`, se le asignan `dueDate` y `status`, y se llama al método.
 * No hay `save`, ni reloj, ni fecha de hoy: todas las fechas son fijas.
 */
test.group('Task | isOverdueOn', () => {
  const AYER = '2026-08-12'
  const HOY = '2026-08-13'
  const MANANA = '2026-08-14'

  /** Una tarea en memoria con la fecha y el estado que se le pidan. */
  function tarea(dueDate: string | null, status: Task['status'] = 'pending') {
    const task = new Task()
    task.dueDate = dueDate
    task.status = status
    return task
  }

  test('fecha anterior al día de referencia y tarea sin hacer: vencida', ({ assert }) => {
    assert.isTrue(tarea(AYER).isOverdueOn(HOY))
  })

  test('fecha igual al día de referencia: no vencida', ({ assert }) => {
    // La regla exige que la fecha sea anterior, no igual.
    assert.isFalse(tarea(HOY).isOverdueOn(HOY))
  })

  test('fecha posterior al día de referencia: no vencida', ({ assert }) => {
    assert.isFalse(tarea(MANANA).isOverdueOn(HOY))
  })

  test('sin fecha: no vencida', ({ assert }) => {
    assert.isFalse(tarea(null).isOverdueOn(HOY))
  })

  test('tarea hecha con la fecha pasada: no vencida', ({ assert }) => {
    assert.isFalse(tarea(AYER, 'done').isOverdueOn(HOY))
  })

  test('la misma fecha pasada vence igual en texto que como Date', ({ assert }) => {
    // El tipo declara `string | null`, pero al leer la columna `date` de la
    // base, el driver entrega un `Date`. Las dos formas tienen que dar la
    // misma lectura, y las dos tienen que decir que está vencida.
    const enTexto = tarea(AYER)

    const comoDate = tarea(null)
    comoDate.dueDate = new Date(`${AYER}T00:00:00.000Z`) as unknown as string

    assert.isTrue(enTexto.isOverdueOn(HOY))
    assert.isTrue(comoDate.isOverdueOn(HOY))
    assert.equal(comoDate.isOverdueOn(HOY), enTexto.isOverdueOn(HOY))
  })
})
