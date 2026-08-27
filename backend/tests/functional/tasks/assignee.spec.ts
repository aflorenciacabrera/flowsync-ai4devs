import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable por nombre e
 * iniciales, que ese dato no arrastra el email ni ningún otro dato de acceso
 * de la cuenta —suelta o en la lista—, y que una cuenta sin nombre sigue
 * dando iniciales.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el assignee trae el nombre del responsable y sus iniciales', async ({
    client,
    assert,
  }) => {
    const responsable = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })

    const response = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .loginAs(responsable)
      .qs({ today: '2026-08-26' })

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('el assignee no incluye el email ni ningún otro dato de la cuenta, suelta o en la lista', async ({
    client,
    assert,
  }) => {
    const responsable = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .loginAs(responsable)
      .qs({ today: '2026-08-26' })

    suelta.assertStatus(200)
    const assigneeSuelta = suelta.body().data.assignee
    assert.notProperty(assigneeSuelta, 'email')
    assert.deepEqual(Object.keys(assigneeSuelta).sort(), ['fullName', 'id', 'initials'])

    const lista = await client.get('/api/v1/tasks').loginAs(responsable)

    lista.assertStatus(200)
    const enLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)
    assert.exists(enLista, 'la tarea creada debe aparecer en la lista')
    assert.notProperty(enLista.assignee, 'email')
    assert.deepEqual(Object.keys(enLista.assignee).sort(), ['fullName', 'id', 'initials'])
  })

  test('un responsable sin nombre da iniciales igualmente', async ({ client, assert }) => {
    const responsable = await User.create({
      fullName: null,
      email: 'sin-nombre@example.com',
      password: 'secreto123',
    })
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })

    const response = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .loginAs(responsable)
      .qs({ today: '2026-08-26' })

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    assert.isString(assignee.initials)
    assert.isNotEmpty(assignee.initials)
  })
})
