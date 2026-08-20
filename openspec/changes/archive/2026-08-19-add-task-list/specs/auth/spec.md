## MODIFIED Requirements

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
