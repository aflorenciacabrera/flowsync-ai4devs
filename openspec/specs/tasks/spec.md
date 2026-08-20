# tasks Specification

## Purpose
La lista compartida de tareas del equipo: una sola lista, idéntica para todos, donde cualquier persona con sesión apunta trabajo escribiendo solo un título, ve de un vistazo quién lleva cada cosa y en qué estado está, y cambia ese estado desde la propia fila sin abrir nada.

## Requirements

### Requirement: Lista única con todas las tareas del espacio
El sistema SHALL devolver en `GET /api/v1/tasks` todas las tareas del espacio, sin filtrar por quién pregunta, y SHALL exigir una sesión válida para hacerlo. No SHALL existir ninguna forma de crear una tarea que otras personas no puedan ver, ni ninguna colección de tareas distinta de esta.

#### Scenario: El contenido no depende de quién pregunta
- **WHEN** dos cuentas distintas envían `GET /api/v1/tasks` con sus respectivos tokens y sin que nadie modifique nada entre ambas peticiones
- **THEN** las dos respuestas contienen exactamente el mismo conjunto de tareas, con los mismos identificadores

#### Scenario: Las tareas ajenas también están
- **WHEN** una cuenta crea una tarea y otra cuenta distinta pide la lista
- **THEN** esa tarea aparece en la respuesta, con los mismos datos que ve quien la creó

#### Scenario: Forma de la respuesta
- **WHEN** se pide la lista con un token vigente
- **THEN** la respuesta es `200 OK` con `{ "data": [ { "id", "title", "status", "assignee": { "id", "fullName" }, "createdAt", "updatedAt" } ] }`

#### Scenario: Espacio sin tareas
- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es `200 OK` con `{ "data": [] }`, no un error

#### Scenario: La lista exige sesión
- **WHEN** se pide la lista sin cabecera `Authorization`, o con un token que no fue emitido por el sistema, o con uno con el que ya se cerró sesión
- **THEN** la respuesta es `401` y no se devuelve ninguna tarea

#### Scenario: Pedir la lista no cambia nada
- **WHEN** se pide la lista dos veces seguidas sin ninguna operación de escritura entre medias
- **THEN** ninguna tarea ha cambiado de estado, de responsable ni de marca de actualización

#### Scenario: Sin orden comprometido
- **WHEN** se pide la lista
- **THEN** la respuesta no promete ningún orden concreto, y quien la consuma no puede apoyarse en el orden de los elementos para nada

### Requirement: Creación de una tarea con el título como único dato
El sistema SHALL crear una tarea en `POST /api/v1/tasks` aceptando `title` como único campo del cuerpo. La tarea creada SHALL nacer con estado `pending` y con la cuenta autenticada como responsable, sin que el cliente pueda indicar ninguna de las dos cosas.

#### Scenario: Alta con solo el título
- **WHEN** se envía `POST /api/v1/tasks` con `{ "title": "Revisar el informe" }` y un token vigente
- **THEN** la respuesta es `201 Created` con `{ "data": { "id", "title": "Revisar el informe", "status": "pending", "assignee": { "id", "fullName" }, "createdAt", "updatedAt" } }`, donde `assignee.id` es el de la cuenta autenticada

#### Scenario: La tarea recién creada aparece en la lista
- **WHEN** se crea una tarea y después se pide `GET /api/v1/tasks`
- **THEN** esa tarea está en la lista, con el mismo `id`, `title`, `status` y `assignee` que devolvió la creación

#### Scenario: El cliente no puede fijar el estado
- **WHEN** la petición de creación incluye `status` con cualquier valor
- **THEN** la respuesta es `422` con un error cuyo `field` es `status`, y no se crea ninguna tarea

#### Scenario: El cliente no puede fijar el responsable
- **WHEN** la petición de creación incluye `assigneeId` con cualquier valor
- **THEN** la respuesta es `422` con un error cuyo `field` es `assigneeId`, y no se crea ninguna tarea

#### Scenario: Crear exige sesión
- **WHEN** se envía la creación sin token válido
- **THEN** la respuesta es `401` y no se crea ninguna tarea

### Requirement: Ninguna tarea existe sin título
El sistema SHALL rechazar con `422` toda creación cuyo `title` falte, esté vacío o contenga solo espacios, y SHALL almacenar el título sin los espacios sobrantes de los extremos. Cuando el título supere la longitud admitida, el sistema SHALL rechazarlo y SHALL NOT guardar una versión recortada.

#### Scenario: Sin título
- **WHEN** se envía la creación sin `title`
- **THEN** la respuesta es `422` con un error cuyo `field` es `title`, y no se crea ninguna tarea

#### Scenario: Título solo con espacios
- **WHEN** se envía la creación con `title` igual a `"   "`
- **THEN** la respuesta es `422` con un error cuyo `field` es `title`, exactamente igual que si el campo faltara, y no se crea ninguna tarea

#### Scenario: Espacios sobrantes en los extremos
- **WHEN** se envía la creación con `title` igual a `"  Revisar el informe  "`
- **THEN** la tarea se crea y su `title` es `"Revisar el informe"`

#### Scenario: Título demasiado largo
- **WHEN** se envía la creación con un `title` de más de 255 caracteres
- **THEN** la respuesta es `422` con un error cuyo `field` es `title` y cuya `rule` es `maxLength`, y no se crea ninguna tarea

#### Scenario: Nunca se recorta en silencio
- **WHEN** se rechaza un título por exceso de longitud
- **THEN** no queda en el sistema ninguna tarea con una versión acortada de ese título

### Requirement: Tres estados fijos identificados en inglés
Una tarea SHALL estar siempre en exactamente uno de tres estados, identificados en la API como `pending`, `in_progress` y `done`. El sistema SHALL rechazar con `422` cualquier otro valor, y SHALL NOT ofrecer forma alguna de añadir, renombrar o eliminar estados.

#### Scenario: Los tres valores admitidos
- **WHEN** se actualiza una tarea al estado `pending`, `in_progress` o `done`
- **THEN** la operación se acepta y la tarea queda en ese estado

#### Scenario: Cualquier otro valor se rechaza
- **WHEN** se envía como estado un valor fuera del conjunto, como `archived`, `PENDING`, `Pendiente`, la cadena vacía o `null`
- **THEN** la respuesta es `422` con un error cuyo `field` es `status`, y la tarea conserva el estado que tenía

#### Scenario: El conjunto de estados no se puede tocar
- **WHEN** se recorre toda la superficie de la API
- **THEN** no existe ninguna operación para crear, renombrar ni eliminar estados, y el conjunto admitido sigue siendo esos tres

### Requirement: Cualquiera actualiza el estado y el responsable de cualquier tarea
El sistema SHALL permitir en `PATCH /api/v1/tasks/:id` modificar el estado, el responsable o ambos, a cualquier cuenta con sesión y sobre cualquier tarea, sin permisos ni roles de por medio. La petición SHALL indicar al menos uno de los dos campos.

#### Scenario: Cambio de estado
- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "status": "in_progress" }` y un token vigente
- **THEN** la respuesta es `200 OK` con la tarea actualizada, y una consulta posterior de la lista la muestra en `in_progress`

#### Scenario: Cambio de responsable
- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "assigneeId": <id de otra cuenta existente> }`
- **THEN** la respuesta es `200 OK` y el `assignee` de la tarea pasa a ser esa cuenta

#### Scenario: La tarea es de otra persona
- **WHEN** se actualiza una tarea cuyo responsable es una cuenta distinta de la autenticada
- **THEN** el cambio se aplica exactamente igual que sobre una tarea propia, sin error ni advertencia

#### Scenario: Cualquier estado puede ir a cualquier otro
- **WHEN** se actualiza una tarea que está en `done` al estado `pending`
- **THEN** el cambio se acepta, porque no hay transiciones prohibidas

#### Scenario: Responsable inexistente
- **WHEN** el `assigneeId` enviado no corresponde a ninguna cuenta
- **THEN** la respuesta es `422` con un error cuyo `field` es `assigneeId`, y la tarea no cambia

#### Scenario: Tarea inexistente
- **WHEN** el identificador de la ruta no corresponde a ninguna tarea
- **THEN** la respuesta es `404` y no se modifica nada

#### Scenario: Petición sin nada que cambiar
- **WHEN** el cuerpo de la actualización no incluye ni `status` ni `assigneeId`
- **THEN** la respuesta es `422` y la tarea no cambia

#### Scenario: Actualizar exige sesión
- **WHEN** se envía la actualización sin token válido
- **THEN** la respuesta es `401` y la tarea no cambia

### Requirement: La tarea no tiene fecha de vencimiento
Una tarea SHALL NOT tener fecha de vencimiento en esta capacidad. Ninguna respuesta SHALL incluir tal fecha y ninguna operación SHALL aceptarla.

#### Scenario: Las respuestas no la traen
- **WHEN** se crea, se lista o se actualiza una tarea
- **THEN** ningún objeto de tarea devuelto contiene una fecha de vencimiento ni ninguna señal de vencida

#### Scenario: Enviarla no la crea
- **WHEN** una petición de creación o de actualización incluye un campo de fecha de vencimiento
- **THEN** la respuesta es `422` y en ningún caso queda guardada esa fecha

### Requirement: Superficie de la API limitada a tres operaciones
Esta capacidad SHALL exponer exactamente tres operaciones sobre tareas: listar, crear y actualizar. No SHALL existir lectura individual de una tarea, ni borrado, ni ninguna operación sobre equipos o miembros.

#### Scenario: Las tres que hay
- **WHEN** se enumeran las rutas de la aplicación
- **THEN** las únicas de esta capacidad son `GET /api/v1/tasks`, `POST /api/v1/tasks` y `PATCH /api/v1/tasks/:id`

#### Scenario: No hay lectura individual
- **WHEN** se envía `GET /api/v1/tasks/:id` con el identificador de una tarea que existe
- **THEN** la respuesta es `404`, porque esa operación no forma parte de la API

#### Scenario: No hay borrado
- **WHEN** se envía `DELETE /api/v1/tasks/:id` con el identificador de una tarea que existe
- **THEN** la respuesta es `404` y la tarea sigue en la lista

#### Scenario: No hay endpoints de equipo
- **WHEN** se enumeran las rutas de la aplicación
- **THEN** no existe ninguna que devuelva miembros, equipos ni espacios

### Requirement: Del responsable solo se expone lo que la lista necesita
El sistema SHALL exponer de la persona responsable únicamente su identificador y su nombre completo, y SHALL NOT incluir su email, su contraseña ni ningún otro dato de su cuenta en las respuestas de esta capacidad.

#### Scenario: Lo que viaja del responsable
- **WHEN** se obtiene cualquier tarea, al listar, al crear o al actualizar
- **THEN** su `assignee` contiene exactamente `id` y `fullName`, y ninguna otra clave

#### Scenario: El email no sale
- **WHEN** se inspecciona el cuerpo completo de cualquier respuesta de esta capacidad
- **THEN** no aparece el email de ninguna cuenta ni ninguna representación de su contraseña

#### Scenario: Responsable sin nombre puesto
- **WHEN** la cuenta responsable no tiene nombre completo
- **THEN** `assignee.fullName` vale `null`, y corresponde al cliente decidir cómo presentarlo

### Requirement: Pantalla con la lista compartida del equipo
La aplicación SHALL ofrecer en `/tasks` una única pantalla con todas las tareas del espacio, en la que cada tarea muestre su título, quién la lleva y en qué estado está, sin necesidad de abrir nada. Esa pantalla SHALL ser la misma para todas las personas y SHALL NOT tener ninguna variante personal.

#### Scenario: Lo que se ve en cada fila
- **WHEN** una persona con sesión abre `/tasks` y hay tareas creadas
- **THEN** cada fila muestra el título de la tarea, el nombre de su responsable y su estado, y esas tres cosas se leen sin abrir ni desplegar nada

#### Scenario: Se puede decir en qué anda cada quien
- **WHEN** el equipo tiene tareas repartidas entre varias personas
- **THEN** recorriendo la pantalla se puede enumerar el trabajo de cada miembro sin pulsar en ninguna tarea

#### Scenario: No hay vista «mis tareas»
- **WHEN** se recorre toda la navegación de la aplicación
- **THEN** no existe ninguna pantalla de tareas distinta de esta, ni ninguna limitada a las tareas propias

#### Scenario: Sin contenido reservado
- **WHEN** dos personas distintas abren `/tasks`
- **THEN** las dos ven el mismo conjunto de tareas, sin que ningún rol dé acceso a nada adicional

#### Scenario: La lista no adelanta ningún vencimiento
- **WHEN** se mira la pantalla
- **THEN** no aparece ninguna fecha de la tarea ni ninguna marca de vencida

#### Scenario: Sin señales de presencia
- **WHEN** otras personas del equipo están usando la aplicación a la vez
- **THEN** la pantalla no muestra quién está conectado ni ninguna otra señal de actividad por persona

#### Scenario: Sin sesión no se llega
- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a la pantalla de inicio de sesión sin ver ninguna tarea

#### Scenario: Mirar no cambia nada
- **WHEN** se abre la pantalla y se recorre de arriba abajo
- **THEN** ninguna tarea cambia de estado ni de responsable

#### Scenario: Desde la lista se llega al perfil propio
- **WHEN** una persona con sesión está en la pantalla de tareas
- **THEN** dispone de un enlace visible a su propio perfil, que sigue siendo la única salida hacia el cierre de sesión

### Requirement: Los estados se leen en castellano y sus identificadores no se ven
La aplicación SHALL presentar los tres estados como «Pendiente», «En curso» y «Hecho», y SHALL NOT mostrar en ningún punto de la interfaz los identificadores `pending`, `in_progress` o `done`.

#### Scenario: Traducción de cada estado
- **WHEN** una tarea está en `pending`, en `in_progress` o en `done`
- **THEN** la pantalla la muestra respectivamente como «Pendiente», «En curso» o «Hecho»

#### Scenario: Los identificadores no llegan a la pantalla
- **WHEN** se lee cualquier texto visible de la pantalla de tareas
- **THEN** no aparece ninguno de los tres identificadores en inglés

### Requirement: El responsable se identifica por su nombre
La aplicación SHALL identificar a la persona responsable de cada tarea por su nombre completo, y SHALL mostrar «Sin nombre» cuando esa cuenta no tenga nombre puesto. No SHALL mostrar nunca su email ni su identificador interno.

#### Scenario: Responsable con nombre
- **WHEN** la responsable de una tarea es una cuenta cuyo nombre completo es `Ada Lovelace`
- **THEN** la fila muestra `Ada Lovelace`

#### Scenario: Responsable sin nombre
- **WHEN** la responsable de una tarea es una cuenta sin nombre completo
- **THEN** la fila muestra «Sin nombre»

#### Scenario: Ni correo ni identificador
- **WHEN** se lee cualquier fila de la lista
- **THEN** no aparece el email de la persona responsable ni su identificador interno, en ningún caso

### Requirement: Pantalla vacía que invita a empezar
La aplicación SHALL explicar de qué va la lista y ofrecer crear la primera tarea cuando el espacio no tenga ninguna, en lugar de mostrar una lista vacía sin más.

#### Scenario: Todavía no hay nada
- **WHEN** una persona con sesión abre `/tasks` y no hay ninguna tarea creada
- **THEN** ve un texto que explica qué es esta lista y el modo de crear la primera tarea, no una zona vacía sin explicación

#### Scenario: Al crear la primera desaparece la invitación
- **WHEN** desde ese estado se crea una tarea
- **THEN** la explicación deja paso a la lista con esa tarea

### Requirement: Crear una tarea desde la propia lista pidiendo solo el título
La aplicación SHALL permitir crear una tarea desde la pantalla de la lista escribiendo únicamente su título, y SHALL mostrarla en la lista al terminar sin recargar ni navegar a otra parte. El flujo de creación SHALL NOT ofrecer ni sugerir responsable, estado, fecha ni ningún otro dato.

#### Scenario: Crear con un título
- **WHEN** una persona escribe un título en la pantalla de tareas y lo envía
- **THEN** la tarea aparece en la lista sin recargar ni cambiar de pantalla, con ese título, en «Pendiente» y con su propio nombre como responsable

#### Scenario: El formulario no pide nada más
- **WHEN** se recorre el flujo de creación entero
- **THEN** el título es el único dato que se pide, y no hay ningún control ni sugerencia para indicar responsable, estado o fecha

#### Scenario: El campo queda listo para la siguiente
- **WHEN** una tarea acaba de crearse desde la pantalla
- **THEN** el campo de título queda vacío, de modo que se puede apuntar otra cosa sin borrar nada

#### Scenario: Envío en curso
- **WHEN** la creación se está enviando
- **THEN** el control de envío queda deshabilitado mientras dura, de modo que un doble envío no crea dos tareas

### Requirement: El problema del título se explica junto al campo
La aplicación SHALL impedir la creación cuando el título esté vacío o contenga solo espacios, y SHALL explicar el motivo en castellano y en lenguaje corriente junto al propio campo, no con el identificador técnico de la regla incumplida.

#### Scenario: Envío sin escribir nada
- **WHEN** se envía el formulario con el campo de título vacío
- **THEN** no se crea ninguna tarea y aparece un mensaje bajo el campo explicando que hace falta un título

#### Scenario: Solo espacios
- **WHEN** se escriben únicamente espacios y se envía
- **THEN** se rechaza igual que si estuviera vacío y no aparece en la lista ninguna fila sin texto

#### Scenario: Título demasiado largo
- **WHEN** el servidor rechaza el título por pasarse de largo
- **THEN** el aviso aparece bajo el campo, lo escrito sigue ahí y en ningún caso se guarda una versión recortada

#### Scenario: El servidor no responde
- **WHEN** el servidor no está accesible al crear
- **THEN** se avisa del fallo de conexión, no se añade ninguna fila a la lista y no se pierde lo escrito

### Requirement: Cambiar el estado desde la fila con un solo gesto
La aplicación SHALL ofrecer en cada fila los tres estados como destinos siempre visibles, con el estado actual señalado, y SHALL aplicar el cambio con una sola pulsación, sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo. Esto SHALL valer para cualquier tarea, sea de quien sea.

#### Scenario: Los tres destinos a la vista
- **WHEN** se mira una fila de la lista
- **THEN** se ven los tres estados «Pendiente», «En curso» y «Hecho» como opciones, con el actual marcado como activo, sin desplegar nada

#### Scenario: Un solo gesto
- **WHEN** se pulsa uno de los otros dos estados de una fila
- **THEN** la tarea pasa a ese estado y la fila lo refleja, sin haber abierto la tarea, sin confirmar en ningún diálogo y sin rellenar ningún campo

#### Scenario: Tarea de otra persona
- **WHEN** se cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** se aplica igual que en una propia, sin pedir permiso y sin mostrar advertencia

#### Scenario: Ningún destino fuera de los tres
- **WHEN** se examinan las opciones de estado de cualquier fila
- **THEN** no hay más destinos que esos tres, y al terminar la tarea está en exactamente uno de ellos

#### Scenario: El cambio no se puede confirmar
- **WHEN** el servidor rechaza el cambio de estado o no está accesible
- **THEN** la fila vuelve a mostrar el estado que la tarea tenía de verdad y se avisa de que el cambio no se aplicó

#### Scenario: Cambiar el estado no toca el responsable
- **WHEN** se cambia el estado de una tarea desde la lista
- **THEN** su responsable sigue siendo el mismo

### Requirement: Reasignar no se ofrece desde la interfaz
La aplicación SHALL NOT ofrecer en esta versión ninguna forma de cambiar el responsable de una tarea, aunque la API lo admita.

#### Scenario: Ningún control para reasignar
- **WHEN** se recorre la pantalla de tareas entera
- **THEN** no hay ningún control para elegir o cambiar la persona responsable de una tarea

#### Scenario: Tampoco se listan los miembros
- **WHEN** se recorre la aplicación
- **THEN** no hay ninguna pantalla ni control que enumere los miembros del espacio
