import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * La condición de vencida contra una fecha leída de la base de datos. Existe
 * porque el driver `pg` entrega las columnas `date` como `Date` salvo que se le
 * diga lo contrario (ver `config/database.ts`), y entonces `isOverdueOn`, que
 * compara texto contra texto, devolvía siempre `false` sin avisar.
 *
 * Hay que releer la tarea con GET: la respuesta del PUT lleva todavía el string
 * recién asignado y daría el resultado correcto aunque la lectura estuviera rota.
 */
test.group('Tasks | vencida', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function tareaConVencimiento(client: any, dueDate: string) {
    await User.create({ fullName: 'Ana', email: 'ana@example.com', password: 'secreto123' })
    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: 'ana@example.com', password: 'secreto123' })
    const auth = `Bearer ${login.body().data.token}`

    const creada = await client
      .post('/api/v1/tasks')
      .header('Authorization', auth)
      .json({ title: 'Entregar el informe' })
    const id = creada.body().data.id as number

    const fijada = await client
      .put(`/api/v1/tasks/${id}/due-date`)
      .header('Authorization', auth)
      .json({ dueDate, today: '2026-10-07' })
    fijada.assertStatus(200)

    return (hoy: string) =>
      client.get(`/api/v1/tasks/${id}`).qs({ today: hoy }).header('Authorization', auth)
  }

  test('una tarea con la fecha en el pasado, releída de la base, está vencida', async ({
    client,
    assert,
  }) => {
    const leer = await tareaConVencimiento(client, '2026-10-01')
    const respuesta = await leer('2026-10-07')

    respuesta.assertStatus(200)
    assert.equal(respuesta.body().data.dueDate, '2026-10-01')
    assert.isTrue(respuesta.body().data.isOverdue)
  })

  test('vencer hoy no es estar vencida, y vencer mañana tampoco', async ({ client, assert }) => {
    const leer = await tareaConVencimiento(client, '2026-10-07')

    const vencidaEl = async (hoy: string) => {
      const respuesta = await leer(hoy)
      return respuesta.body().data.isOverdue as boolean
    }

    assert.isFalse(await vencidaEl('2026-10-07'))
    assert.isFalse(await vencidaEl('2026-10-06'))
    assert.isTrue(await vencidaEl('2026-10-08'))
  })
})
