/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // Tres operaciones y solo tres: listar, crear y actualizar. No hay lectura
    // individual ni borrado, así que `GET`/`DELETE` sobre una tarea concreta
    // caen en el 404 por defecto del router, que es el comportamiento buscado.
    router
      .group(() => {
        router.get('', [controllers.Tasks, 'index'])
        router.post('', [controllers.Tasks, 'store'])
        router.patch(':id', [controllers.Tasks, 'update'])
      })
      .prefix('tasks')
      .as('tasks')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
