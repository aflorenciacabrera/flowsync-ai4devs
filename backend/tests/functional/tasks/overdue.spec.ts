import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cuándo una tarea está vencida. Un test por cada uno de los siete scenarios
 * del requisito «Cuándo una tarea está vencida» de
 * `openspec/specs/tasks/spec.md`: vencida si, y solo si, tiene fecha, esa
 * fecha es anterior al día de referencia y su estado no es `done`.
 *
 * Todo entra por HTTP, como lo haría el cliente: la tarea se crea con
 * `POST /api/v1/tasks`, la fecha se fija con `PUT /api/v1/tasks/:id/due-date`,
 * el estado con `PATCH /api/v1/tasks/:id/status`, y la condición de vencida
 * se lee en `isOverdue` de `GET /api/v1/tasks/:id`.
 *
 * El día de referencia lo pone quien mira, en el parámetro `today`. Aquí no se
 * usa el reloj ni la fecha de hoy: todas las fechas son fijas, para que el
 * resultado sea el mismo el día que se escriben y cualquier otro.
 */
test.group('Tasks | vencimiento', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const AYER = '2026-08-12'
  const HOY = '2026-08-13'
  const MANANA = '2026-08-14'

  /** Deja creada una cuenta con una tarea sin fecha a su nombre. */
  async function tareaSinFecha(client: any) {
    const email = 'ada@example.com'
    await User.create({ fullName: 'Ada Lovelace', email, password: 'secreto123' })

    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })
    const token = login.body().data.token as string

    const creada = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title: 'Entregar el informe' })

    creada.assertStatus(201)

    return { token, id: creada.body().data.id as number }
  }

  /** Fija la fecha de vencimiento y devuelve la respuesta entera del PUT. */
  async function fijarFecha(
    client: any,
    token: string,
    id: number,
    dueDate: string,
    today: string
  ) {
    const respuesta = await client
      .put(`/api/v1/tasks/${id}/due-date`)
      .header('Authorization', `Bearer ${token}`)
      .json({ dueDate, today })

    respuesta.assertStatus(200)

    return respuesta
  }

  /** Cambia el estado. El PATCH no devuelve ni `dueDate` ni `isOverdue`. */
  async function cambiarEstado(client: any, token: string, id: number, status: string) {
    const respuesta = await client
      .patch(`/api/v1/tasks/${id}/status`)
      .header('Authorization', `Bearer ${token}`)
      .json({ status })

    respuesta.assertStatus(200)
  }

  /** La tarea suelta tal y como llega al cliente que mira desde `today`. */
  async function consultar(client: any, token: string, id: number, today: string) {
    const respuesta = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    respuesta.assertStatus(200)

    return respuesta.body().data
  }

  test('fecha del día anterior: la tarea llega vencida', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, AYER, HOY)

    const tarea = await consultar(client, token, id, HOY)

    assert.isTrue(tarea.isOverdue)
  })

  test('vencer hoy todavía no es estar vencida', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, HOY, HOY)

    const tarea = await consultar(client, token, id, HOY)

    // La regla exige que la fecha sea anterior al día de referencia, no igual.
    assert.isFalse(tarea.isOverdue)
  })

  test('fecha futura: la tarea no llega vencida', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, MANANA, HOY)

    const tarea = await consultar(client, token, id, HOY)

    assert.isFalse(tarea.isOverdue)
  })

  test('sin fecha no se vence nunca', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)

    // La creación no admite fecha, así que la tarea sigue sin ella. Se mira
    // desde un día muy posterior a cualquier momento en que haya podido
    // crearse: la antigüedad no cuenta, solo la fecha de vencimiento.
    const tarea = await consultar(client, token, id, '2099-12-31')

    assert.isNull(tarea.dueDate)
    assert.equal(tarea.status, 'pending')
    assert.isFalse(tarea.isOverdue)
  })

  test('darla por hecha la deja de vencer', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, AYER, HOY)

    const antes = await consultar(client, token, id, HOY)
    assert.isTrue(antes.isOverdue)

    // El PATCH de estado no devuelve ni `isOverdue` ni `dueDate`, así que el
    // efecto se comprueba en una lectura posterior.
    await cambiarEstado(client, token, id, 'done')

    const despues = await consultar(client, token, id, HOY)

    assert.equal(despues.status, 'done')
    assert.isFalse(despues.isOverdue)
    assert.equal(despues.dueDate, AYER)
  })

  test('una tarea hecha con la fecha pasada no llega vencida', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, AYER, HOY)
    await cambiarEstado(client, token, id, 'done')

    const tarea = await consultar(client, token, id, HOY)

    assert.equal(tarea.status, 'done')
    assert.isFalse(tarea.isOverdue)
  })

  test('aplazar resuelve el vencimiento en la misma respuesta', async ({ client, assert }) => {
    const { token, id } = await tareaSinFecha(client)
    await fijarFecha(client, token, id, AYER, HOY)

    const antes = await consultar(client, token, id, HOY)
    assert.isTrue(antes.isOverdue)

    // Aquí `isOverdue` se lee en la propia respuesta del PUT, no en un GET
    // posterior: es lo que exige el scenario.
    const aplazada = await fijarFecha(client, token, id, MANANA, HOY)

    assert.equal(aplazada.body().data.dueDate, MANANA)
    assert.isFalse(aplazada.body().data.isOverdue)
  })
})
