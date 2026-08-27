# 2. Los tests de integración pasan a ser la fuente de verdad ejecutable

> Escenario hipotético: este ADR se escribe suponiendo que ha pasado alrededor de un año desde [0001](0001-openspec-como-fuente-de-verdad.md) y que, en ese tiempo, el equipo ha dejado de mantener `openspec/`. Registra esa decisión futura, no algo que ya haya ocurrido en el repositorio de hoy.

## Contexto

[0001](0001-openspec-como-fuente-de-verdad.md) adoptó `openspec/specs/<capability>/spec.md`, alimentada por los deltas de `openspec/changes/`, como la fuente de verdad del comportamiento de FlowSync. Ese mismo ADR ya dejó anotados, en su sección de consecuencias, los costes con los que convivía la decisión: ningún check automático comprobaba que la spec viva y el código no hubieran divergido; las tres delta-specs archivadas hasta entonces (`add-task-list`, `add-task-status-filter`, `add-task-due-date`) documentaban comportamiento sin un solo test que lo respaldara; y fundir un delta exigía reescribir el requisito entero a mano, con el riesgo de que ese paso se saltara.

Con el tiempo, esos costes dejaron de ser una advertencia y pasaron a ser la razón del cambio:

- El paso manual de archivar un change y fundir su delta en la spec viva se siguió saltando, y no una vez: la spec volvió a quedarse desfasada del código más de una vez, del mismo modo en que ya lo había hecho antes de `add-task-status-filter`, y cada vez hacía falta releer controladores y validadores para saber cuál de las dos versiones —la prosa o el código— era la que mandaba.
- Mientras tanto, la cobertura de tests de integración (`backend/tests/functional/`) creció capability a capability. Donde antes solo existían los tests de `auth/` y un único fichero (`tasks/assignee.spec.ts`) cubriendo un requisito suelto de `tasks`, el conjunto de requisitos con al menos un escenario cubierto por un test que corre con `node ace test` acabó siendo mayor que el conjunto mantenido al día en `openspec/specs/`.
- A diferencia de una spec en prosa, un test que falla es ruidoso por construcción: no hace falta que nadie se acuerde de comprobarlo. Una spec desfasada, en cambio, sigue leyéndose exactamente igual de convincente que una al día — nada en `openspec/` avisa de que un requisito ya no describe el sistema real, y eso ya había pasado antes.
- El propio formato de OpenSpec —delta con secciones `ADDED`/`MODIFIED Requirement` sobre el requisito entero, más `proposal.md` con `Why`/`What Changes`/`Impact`— resultó caro de mantener para cambios pequeños: documentar un ajuste de una línea de comportamiento seguía exigiendo escribir un change completo antes de tocar código, o documentarlo después como ya hizo `add-task-status-filter`.

## Decisión

Dejar de mantener `openspec/specs/` y `openspec/changes/` como descripción del comportamiento vigente. La suite de tests de integración (`backend/tests/functional/**/*.spec.ts`, ejecutada con `node ace test`) pasa a ser la única fuente de verdad **ejecutable** de FlowSync:

- Ante la pregunta «¿qué hace `tasks` (o `auth`) hoy?», la respuesta se busca en los tests funcionales de esa capability, no en `openspec/specs/`.
- Todo requisito de comportamiento que importe queda expresado como uno o más tests: si no hay un test que lo verifique, no cuenta como comportamiento garantizado del sistema, se comporte como se comporte hoy el código.
- No se abren más changes en `openspec/changes/`, ni se editan más los `spec.md` de `openspec/specs/`. Los ya archivados —los tres de este momento más los que se hayan sumado desde 0001— se conservan tal cual, como registro histórico de cómo se pensó cada capability al construirla, con el mismo estatus que ya tenían `docs/prd/` y `docs/backlog/` desde 0001: útiles para el porqué, no para el qué de hoy.
- Cuando un test y el comportamiento del sistema no coincidan, gana el test: si el sistema hace algo distinto de lo que el test espera, o el test está mal y se corrige, o el comportamiento es el que hay que arreglar — pero la discrepancia la señala la propia suite al fallar, no una relectura manual de una spec en prosa.

## Estado

Aceptada. Reemplaza a [0001](0001-openspec-como-fuente-de-verdad.md), que queda marcada como reemplazada por este ADR.

## Consecuencias

**A favor:**

- La fuente de verdad deja de poder desfasarse en silencio: un test roto falla la ejecución, mientras que un párrafo de `openspec/specs/` desfasado se leía exactamente igual de convincente que uno al día. El coste que 0001 ya señalaba —«nada avisa»— desaparece por construcción.
- Desaparece la doble escritura que 0001 señalaba como coste: un requisito ya no se dice una vez en el delta del change y otra vez al fundirse en la spec viva. Se dice una sola vez, como test.
- La fuente de verdad y la regresión son la misma cosa: verificar que `tasks` sigue haciendo lo que decía que hacía y evitar que un cambio futuro lo rompa dejan de ser dos actividades separadas.

**En contra — lo que cuesta:**

- Se pierde la narrativa que `proposal.md` daba a cada decisión: por qué el límite del título es 200 caracteres y no otro número, por qué no se trajo una librería de calendario para la fecha de vencimiento, qué quedaba fuera de alcance a propósito. Un test verifica el qué, no explica el porqué; esa explicación, si se quiere conservar, tiene que vivir en otro sitio —el propio test, un comentario, el historial de commits— y nada obliga a que se escriba.
- Un requisito sin test correspondiente deja de ser visible como pendiente. Con `openspec/specs/`, un requisito sin cobertura seguía apareciendo, en prosa, como parte del contrato — quedaba documentado aunque no verificado. Sin esa capa, lo que nadie ha escrito como test simplemente no existe en ningún sitio, ni siquiera como advertencia.
- «Fuente de verdad ejecutable» solo lo es de verdad si algo ejecuta la suite de forma automática y visible; a día de este ADR no hay ningún workflow de CI en el repositorio (`.github/workflows/` no existe), así que la garantía depende, igual que dependía antes el archivado de un change, de que alguien corra `node ace test` a mano antes de dar un cambio por bueno.
- Los tests verifican comportamiento observable —peticiones HTTP y sus respuestas—, no necesariamente las reglas que no se manifiestan en la superficie de la API con la misma claridad con la que las explicaba un `Requirement` en prosa (por ejemplo, una regla de UI sin backend detrás, como la mayoría de los requisitos de interfaz de `openspec/specs/tasks/spec.md`, que no tienen equivalente en `backend/tests/functional/`). Para esa parte del comportamiento, la migración no tiene un test que la sustituya de forma directa.
- Los tres changes archivados y sus deltas siguen describiendo el comportamiento que se decidió en su momento, pero ya no hay ningún mecanismo que los mantenga acompasados con la suite de tests si el comportamiento vuelve a cambiar: son historia congelada, no algo que alguien vaya a seguir leyendo para saber qué hace el sistema hoy.
