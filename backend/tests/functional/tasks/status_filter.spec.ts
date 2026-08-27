import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Test de regresión: `listTasksValidator` aceptaba `status` como texto libre
 * (`vine.string().optional()`), así que `GET /api/v1/tasks?status=archivado`
 * pasaba la validación, no matcheaba ninguna fila y respondía `200` con una
 * lista vacía en vez de `422`. Cubre el requisito «Un estado que no existe se
 * rechaza, no se responde vacío» de `openspec/specs/tasks/spec.md`.
 */
test.group('Tasks | filtro por estado', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('un estado inventado se rechaza con 422 y no con una lista vacía', async ({
    client,
    assert,
  }) => {
    const cuenta = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada-filtro@example.com',
      password: 'secreto123',
    })

    const response = await client.get('/api/v1/tasks').loginAs(cuenta).qs({ status: 'archivado' })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'status', rule: 'enum' }] })
    assert.notEqual(response.status(), 200)
  })

  test('un estado vacío también se rechaza', async ({ client }) => {
    const cuenta = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada-filtro-vacio@example.com',
      password: 'secreto123',
    })

    const response = await client.get('/api/v1/tasks').loginAs(cuenta).qs({ status: '' })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'status' }] })
  })

  test('un estado válido sigue filtrando la lista', async ({ client, assert }) => {
    const cuenta = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada-filtro-valido@example.com',
      password: 'secreto123',
    })
    await Task.create({ title: 'Pendiente', status: 'pending', assigneeId: cuenta.id })
    await Task.create({ title: 'En curso', status: 'in_progress', assigneeId: cuenta.id })

    const response = await client.get('/api/v1/tasks').loginAs(cuenta).qs({ status: 'in_progress' })

    response.assertStatus(200)
    const tareas = response.body().data
    assert.isTrue(tareas.every((t: { status: string }) => t.status === 'in_progress'))
  })
})
