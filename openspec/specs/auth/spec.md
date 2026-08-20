# auth Specification

## Purpose
Permite que una persona cree su cuenta en FlowSync, entre con email y contraseña, mantenga su sesión abierta entre visitas y la cierre cuando quiera. Es la única puerta de acceso a la aplicación: sin sesión válida no se ve ninguna pantalla del producto.

## Requirements

### Requirement: Registro de una cuenta nueva
El sistema SHALL permitir crear una cuenta sin credenciales previas mediante `POST /api/v1/auth/signup`, y SHALL devolver el perfil recién creado junto con un token de acceso ya utilizable.

#### Scenario: Alta con datos válidos
- **WHEN** se envía `POST /api/v1/auth/signup` con `email` no registrado, `password` de entre 8 y 32 caracteres y `passwordConfirmation` idéntico
- **THEN** la respuesta es `200 OK` con `{ "data": { "user": { "id", "fullName", "email", "initials", "createdAt", "updatedAt" }, "token": "..." } }`, la cuenta queda creada y el token devuelto ya sirve para autenticar peticiones

#### Scenario: Alta sin nombre completo
- **WHEN** la petición incluye `fullName` con valor `null`
- **THEN** la cuenta se crea igualmente y el `fullName` del perfil devuelto es `null`

#### Scenario: El email ya está registrado
- **WHEN** se intenta registrar un email que ya tiene cuenta
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "database.unique", "field": "email" } ] }` y no se crea una segunda cuenta con ese email

#### Scenario: Contraseña de longitud inválida
- **WHEN** `password` tiene menos de 8 o más de 32 caracteres
- **THEN** la respuesta es `422` con un error cuyo `field` es `password`, y no se crea ninguna cuenta

#### Scenario: La confirmación no coincide
- **WHEN** `passwordConfirmation` es distinto de `password`
- **THEN** la respuesta es `422` con un error de `rule` `sameAs` y `field` `passwordConfirmation`, y no se crea ninguna cuenta

#### Scenario: Email con formato inválido o demasiado largo
- **WHEN** `email` no tiene forma de dirección de correo, o supera los 254 caracteres
- **THEN** la respuesta es `422` con un error cuyo `field` es `email`, y no se crea ninguna cuenta

#### Scenario: La contraseña nunca vuelve al cliente
- **WHEN** una petición de registro termina correctamente
- **THEN** el cuerpo de la respuesta no contiene la contraseña enviada ni ninguna representación cifrada de ella

### Requirement: Inicio de sesión con credenciales
El sistema SHALL emitir un token de acceso nuevo a través de `POST /api/v1/auth/login` cuando el email y la contraseña correspondan a una cuenta existente, y SHALL rechazar cualquier otra combinación sin revelar cuál de los dos datos falla.

#### Scenario: Credenciales correctas
- **WHEN** se envía `POST /api/v1/auth/login` con el email y la contraseña de una cuenta existente
- **THEN** la respuesta es `200 OK` con `{ "data": { "user": {...}, "token": "..." } }` y ese token autentica las peticiones siguientes

#### Scenario: Contraseña incorrecta
- **WHEN** el email corresponde a una cuenta pero la contraseña no es la suya
- **THEN** la respuesta es `400` con `{ "errors": [ { "message": "..." } ] }`, sin `field`, y no se emite ningún token

#### Scenario: La cuenta no existe
- **WHEN** el email no corresponde a ninguna cuenta
- **THEN** la respuesta es indistinguible de la de contraseña incorrecta: `400` con el mismo cuerpo, de modo que no se puede averiguar si un email está registrado

#### Scenario: Petición mal formada
- **WHEN** falta el email o la contraseña, o el email no tiene forma de dirección de correo
- **THEN** la respuesta es `422` con un error por cada campo inválido

#### Scenario: Varias sesiones simultáneas
- **WHEN** la misma cuenta inicia sesión dos veces
- **THEN** se obtienen dos tokens distintos y ambos siguen siendo válidos a la vez

### Requirement: Consulta del perfil propio
El sistema SHALL devolver en `GET /api/v1/account/profile` los datos de la cuenta dueña del token presentado, y SHALL rechazar la petición cuando no haya un token válido.

#### Scenario: Petición autenticada
- **WHEN** se envía `GET /api/v1/account/profile` con la cabecera `Authorization: Bearer <token>` de un token vigente
- **THEN** la respuesta es `200 OK` con `{ "data": { "id", "fullName", "email", "initials", "createdAt", "updatedAt" } }`, correspondiente a la cuenta dueña de ese token

#### Scenario: Petición sin token
- **WHEN** se envía la petición sin cabecera `Authorization`
- **THEN** la respuesta es `401` con `{ "errors": [ { "message": "..." } ] }` y no se devuelve dato alguno del perfil

#### Scenario: Token inexistente o manipulado
- **WHEN** el token presentado no fue emitido por el sistema o ha sido alterado
- **THEN** la respuesta es `401`

### Requirement: Cierre de sesión que revoca solo el token usado
El sistema SHALL invalidar en `POST /api/v1/account/logout` únicamente el token con el que se autentica la propia petición, dejando intactos los demás tokens de la misma cuenta.

#### Scenario: Cierre de sesión correcto
- **WHEN** se envía `POST /api/v1/account/logout` con un token vigente
- **THEN** la respuesta es `200 OK` con `{ "message": "Logged out successfully" }`, sin envoltorio `data`

#### Scenario: El token cerrado deja de servir
- **WHEN** se reutiliza un token con el que ya se cerró sesión
- **THEN** cualquier petición autenticada con él responde `401`

#### Scenario: Las otras sesiones sobreviven
- **WHEN** una cuenta con dos sesiones abiertas cierra una de ellas
- **THEN** el token de la otra sesión sigue devolviendo `200 OK` en la consulta del perfil

#### Scenario: Cierre de sesión sin token
- **WHEN** se envía la petición sin token válido
- **THEN** la respuesta es `401` y no se revoca nada

### Requirement: Vigencia indefinida de los tokens
El sistema SHALL mantener válido cada token emitido hasta que se cierre sesión con él; los tokens SHALL NOT caducar por el paso del tiempo.

#### Scenario: Un token antiguo sigue valiendo
- **WHEN** se usa un token emitido hace mucho tiempo y con el que no se ha cerrado sesión
- **THEN** la petición se autentica correctamente

#### Scenario: No se comunica caducidad alguna
- **WHEN** se obtiene un token al registrarse o al iniciar sesión
- **THEN** la respuesta no incluye ninguna fecha de caducidad ni tiempo de vida

### Requirement: Iniciales derivadas del perfil
El sistema SHALL incluir en todo perfil devuelto un campo `initials` de dos caracteres en mayúsculas, derivado del nombre completo cuando exista y del email cuando no.

#### Scenario: Nombre completo de dos palabras
- **WHEN** el nombre completo es `Ada Lovelace`
- **THEN** `initials` vale `AL`

#### Scenario: Nombre completo de una sola palabra
- **WHEN** el nombre completo es `Ada`
- **THEN** `initials` vale `AD`

#### Scenario: Cuenta sin nombre completo
- **WHEN** el nombre completo es `null` y el email es `ada@flowsync.dev`
- **THEN** `initials` vale `AF`

### Requirement: Respuestas siempre en JSON
El sistema SHALL responder en JSON a toda petición de esta capacidad, con independencia de la cabecera `Accept` que envíe el cliente.

#### Scenario: Cliente que pide HTML
- **WHEN** se envía cualquiera de las peticiones de esta capacidad con `Accept: text/html`
- **THEN** la respuesta es JSON, tanto en éxito como en error

#### Scenario: Forma uniforme de los errores
- **WHEN** una petición de esta capacidad falla
- **THEN** el cuerpo es un objeto con la clave `errors`, que contiene una lista de errores con al menos un `message`

### Requirement: Pantalla de registro
La aplicación SHALL ofrecer a una persona sin sesión una pantalla de registro que recoja nombre completo (opcional), email y contraseña con su confirmación, y que la deje con la sesión iniciada al terminar.

#### Scenario: Lo que se ve al llegar
- **WHEN** una persona sin sesión abre `/register`
- **THEN** ve los campos «Nombre completo» marcado como opcional, «Email», «Contraseña» con la indicación «Entre 8 y 32 caracteres.» y «Repite la contraseña», un botón «Crear cuenta» y un enlace para iniciar sesión si ya tiene cuenta

#### Scenario: Registro correcto
- **WHEN** rellena email y contraseña válidos y confirma la contraseña
- **THEN** queda con la sesión iniciada y pasa directamente a la lista de tareas del equipo, sin tener que volver a escribir sus credenciales

#### Scenario: Registro dejando el nombre en blanco
- **WHEN** deja vacío el campo de nombre completo y el resto es válido
- **THEN** la cuenta se crea igualmente y su perfil muestra «Sin nombre» en lugar del nombre

#### Scenario: Las contraseñas no coinciden
- **WHEN** escribe una confirmación distinta de la contraseña y pulsa «Crear cuenta»
- **THEN** ve «Las contraseñas no coinciden.» bajo el campo de confirmación, no se crea ninguna cuenta y todo lo que había escrito sigue en el formulario

#### Scenario: Email ya registrado
- **WHEN** intenta registrarse con un email que ya tiene cuenta
- **THEN** ve «Ese email ya está registrado. Inicia sesión en su lugar.» junto al campo de email

#### Scenario: Envío en curso
- **WHEN** el registro se está enviando
- **THEN** el botón muestra «Creando cuenta…» y está deshabilitado, de modo que no puede enviarse dos veces

### Requirement: Pantalla de inicio de sesión
La aplicación SHALL ofrecer a una persona sin sesión una pantalla de inicio de sesión con email y contraseña, que la lleve a la lista de tareas al acertar y que explique el motivo cuando no.

#### Scenario: Lo que se ve al llegar
- **WHEN** una persona sin sesión abre `/login`
- **THEN** ve los campos «Email» y «Contraseña», un botón «Entrar» y un enlace para crear una cuenta

#### Scenario: Credenciales correctas
- **WHEN** introduce el email y la contraseña de su cuenta
- **THEN** pasa a la lista de tareas del equipo con la sesión iniciada

#### Scenario: Credenciales incorrectas
- **WHEN** el email o la contraseña no son correctos
- **THEN** ve un aviso destacado en la parte superior del formulario con «El email o la contraseña no son correctos.», sigue en la pantalla de inicio de sesión y conserva lo que había escrito

#### Scenario: Envío en curso
- **WHEN** el inicio de sesión se está enviando
- **THEN** el botón muestra «Entrando…» y está deshabilitado

#### Scenario: No hay servidor al que llamar
- **WHEN** el servidor no está accesible al enviar el formulario
- **THEN** ve «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y no se pierde lo escrito

### Requirement: Errores de validación colocados junto a su campo
La aplicación SHALL mostrar cada error de validación devuelto por el servidor debajo del campo al que corresponde, asociado a ese campo para quien use un lector de pantalla, y SHALL reservar el aviso superior para los errores que no pertenecen a ningún campo de la pantalla.

#### Scenario: Error sobre un campo de la pantalla
- **WHEN** el servidor rechaza el formulario por un campo que la pantalla muestra
- **THEN** el mensaje aparece bajo ese campo, el campo queda marcado como inválido y no se duplica en el aviso superior

#### Scenario: Error que no pertenece a ningún campo
- **WHEN** el servidor rechaza el envío sin señalar un campo concreto
- **THEN** el mensaje aparece en el aviso destacado de la parte superior del formulario

#### Scenario: Campo obligatorio vacío
- **WHEN** envía el formulario con el email vacío
- **THEN** el envío no lo bloquea el navegador con un mensaje propio, sino que la propia aplicación muestra el error bajo el campo de email

#### Scenario: Mensajes en castellano
- **WHEN** el servidor devuelve un error de validación
- **THEN** el texto que se muestra está redactado en castellano y en lenguaje corriente, no con el identificador técnico de la regla incumplida

### Requirement: Pantalla de perfil propio
La aplicación SHALL mostrar a la persona con sesión iniciada los datos de su cuenta y un modo de cerrar la sesión.

#### Scenario: Lo que se ve en el perfil
- **WHEN** una persona con sesión abre `/profile`
- **THEN** ve un círculo con sus iniciales, su nombre completo, su email, la etiqueta «Miembro desde» con la fecha de creación de su cuenta en formato largo en castellano, y un botón «Cerrar sesión»

#### Scenario: Cuenta sin nombre
- **WHEN** su cuenta no tiene nombre completo
- **THEN** en lugar del nombre se muestra «Sin nombre», y el resto de los datos se muestra igual

### Requirement: Sesión que sobrevive a las recargas
La aplicación SHALL recordar la sesión entre recargas y entre visitas, y SHALL comprobarla contra el servidor antes de darla por buena, sin pedir de nuevo las credenciales.

#### Scenario: Recarga con sesión válida
- **WHEN** una persona con sesión recarga la página o cierra la pestaña y vuelve a abrir la aplicación
- **THEN** ve brevemente un indicador de carga y después la pantalla en la que estaba, o la lista de tareas si venía de la raíz, sin volver a escribir sus credenciales

#### Scenario: La sesión recordada ya no vale
- **WHEN** al volver a la aplicación el servidor rechaza la sesión recordada
- **THEN** acaba en la pantalla de inicio de sesión con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.», y una nueva recarga ya no intenta restaurar nada ni vuelve a mostrar ese aviso

#### Scenario: El servidor no responde al restaurar la sesión
- **WHEN** al volver a la aplicación el servidor no está accesible
- **THEN** acaba en la pantalla de inicio de sesión con el aviso de que no se pudo conectar con el servidor, y basta con recargar cuando el servidor vuelva para recuperar la sesión sin escribir de nuevo las credenciales

#### Scenario: Un error de un intento actual manda sobre el aviso de sesión perdida
- **WHEN** llega a la pantalla de inicio de sesión con el aviso de una sesión perdida y luego falla un intento de entrar
- **THEN** el aviso pasa a mostrar el error de ese intento, no el de la sesión anterior

### Requirement: Pantallas protegidas según el estado de la sesión
La aplicación SHALL impedir el acceso a las pantallas de sesión iniciada a quien no la tenga, SHALL apartar de las pantallas de acceso a quien ya la tenga llevándola a la lista de tareas, y SHALL esperar sin redirigir mientras la sesión aún se está comprobando.

#### Scenario: Sin sesión hacia una pantalla protegida
- **WHEN** una persona sin sesión abre `/profile` o `/tasks`
- **THEN** es llevada a la pantalla de inicio de sesión sin ver nada de esa pantalla

#### Scenario: Con sesión hacia las pantallas de acceso
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a la lista de tareas del equipo

#### Scenario: Mientras la sesión se está comprobando
- **WHEN** la aplicación aún está comprobando una sesión recordada
- **THEN** se muestra un indicador de carga y no se redirige a ninguna de las dos partes, de modo que una recarga nunca expulsa a quien sí tiene sesión

#### Scenario: Dirección desconocida
- **WHEN** se abre cualquier dirección que la aplicación no reconoce, incluida la raíz
- **THEN** se lleva a la lista de tareas, y desde ahí a la de inicio de sesión si no hay sesión

### Requirement: Cierre de sesión desde la aplicación
La aplicación SHALL cerrar la sesión local cuando la persona lo pida, incluso si el servidor no llega a confirmarlo, y SHALL devolverla a la pantalla de inicio de sesión.

#### Scenario: Cierre de sesión correcto
- **WHEN** pulsa «Cerrar sesión» en su perfil
- **THEN** el botón muestra «Cerrando sesión…» y acaba en la pantalla de inicio de sesión, sin ningún aviso de error

#### Scenario: El servidor falla al cerrar sesión
- **WHEN** pulsa «Cerrar sesión» y el servidor no responde o rechaza la petición
- **THEN** la sesión se cierra igualmente en la aplicación y acaba en la pantalla de inicio de sesión

#### Scenario: Tras cerrar sesión no se vuelve atrás
- **WHEN** después de cerrar sesión intenta abrir `/profile` o recarga la aplicación
- **THEN** es llevada a la pantalla de inicio de sesión y su sesión no se recupera
