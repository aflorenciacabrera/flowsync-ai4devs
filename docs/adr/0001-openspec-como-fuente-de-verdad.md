# 1. Usar las delta-specs de OpenSpec como fuente de verdad viva

## Contexto

`openspec/` tiene hoy dos partes con roles distintos:

- `openspec/specs/<capability>/spec.md` — una spec **viva** por capability (`auth` y `tasks`, las dos únicas que existen). Cada una tiene un `Purpose` en prosa y una lista de `Requirement` con `SHALL`/`NOT SHALL` seguidos de sus `Scenario` en `WHEN`/`THEN`. Describe el sistema *tal como es ahora*, no una intención pasada.
- `openspec/changes/archive/` — tres changes ya cerrados (`2026-08-13-add-task-list`, `2026-08-13-add-task-status-filter`, `2026-08-13-add-task-due-date`), cada uno con `proposal.md` (`Why` / `What Changes` / `Capabilities` / `Impact`), `design.md`, `tasks.md` y, dentro, su propio `specs/<capability>/spec.md` con un delta: secciones `ADDED Requirements` o `MODIFIED Requirements` que reemplazan al requisito entero, no un parche de texto suelto. Archivar un change funde ese delta en la spec viva de arriba.

Esto ya ha tenido que arreglar una desviación real, no hipotética: `openspec/specs/tasks/spec.md` decía que `GET /api/v1/tasks` devuelve «todas las tareas del espacio». Eso dejó de ser cierto en cuanto FS-142 implementó el filtro por estado en el código, y la spec viva se quedó desfasada durante un tiempo sin que nada lo señalara. El `proposal.md` de `add-task-status-filter` lo dice explícitamente: *"Este change documenta comportamiento que ya está implementado y funcionando en el repositorio. [...] corregir los requisitos de la spec viva que este comportamiento vuelve falsos"*. El propio `add-task-due-date`, escrito antes de que esa corrección se archivara, deja anotado el riesgo: *"quien lea esa spec debe saber que ese requisito ya no describe el sistema real"*.

La otra fuente de verdad candidata es `docs/prd/` y `docs/backlog/`: historias, criterios de aceptación y decisiones de producto (PA-9, CA-3, etc.) tomadas al arrancar el MVP. Son útiles para el porqué de una decisión, pero describen el momento en que se escribieron, no se actualizan cuando el comportamiento cambia, y ninguno de los tres changes archivados los toca al cerrarse — solo tocan `openspec/specs/`.

`CLAUDE.md`, que es la guía de referencia del proyecto para quien —persona o agente— toca código, no menciona `openspec/` en ningún punto, pese a que el propio historial de commits ya sigue este flujo (`docs(openspec): el filtro por estado entra en la spec viva`, y los tres changes archivados). La decisión que registra este ADR no es adoptar algo nuevo: es hacer explícito y vinculante lo que ya se ha estado haciendo, y que hasta ahora dependía de que cada persona se acordara.

## Decisión

`openspec/specs/<capability>/spec.md` es la fuente de verdad del comportamiento vigente de cada capability. En concreto:

- Ante la pregunta «¿qué hace `tasks` (o `auth`) hoy?», la respuesta se busca ahí, no en `docs/prd/`, no en `docs/backlog/` y no leyendo controladores y componentes para reconstruirla.
- Todo cambio de comportamiento observable se propone primero como un change en `openspec/changes/<slug>/`, con su `proposal.md` y su delta de specs (`ADDED`/`MODIFIED`/`REMOVED Requirement`) — incluso cuando, como en `add-task-status-filter`, el cambio ya está implementado y lo que falta es documentarlo.
- Al cerrarse, el change se archiva y su delta se funde en la spec viva, que pasa a describir el sistema como es ahora. Esto es responsabilidad de quien cierra el change, con las skills `openspec-archive-change` / `openspec-sync-specs` del propio proyecto.
- Ante una discrepancia entre lo que dice `openspec/specs/` y lo que hace el código desplegado, gana el código, y la corrección se hace con un change — nunca editando la spec viva a mano fuera de ese flujo.
- `docs/prd/` y `docs/backlog/` se conservan como registro histórico de cómo y por qué se decidió el alcance, no como el sitio donde consultar el comportamiento actual.

## Estado

Aceptada.

## Consecuencias

**A favor:**

- Una sola pregunta tiene un único sitio con la respuesta completa, en prosa verificable (`SHALL` + `Scenario`), en vez de tener que reconstruirla cruzando validadores, controladores, transformers y componentes de frontend.
- Proponer el change antes de (o junto con) el código obliga a declarar `Impact` y riesgos explícitamente, lo que ya ha dejado por escrito decisiones que si no habrían quedado implícitas — como no traer una librería de calendario para la fecha de vencimiento, o no escribir tests en los tres changes archivados.
- Cuando el código se adelanta a la spec —como pasó con el filtro por estado—, el propio formato de change da un sitio natural para documentar lo ya implementado sin fingir que es trabajo nuevo, dejando rastro escrito de la corrección y de cuánto tiempo estuvo la spec desfasada.

**En contra — lo que cuesta:**

- Cada requisito se escribe dos veces: una en el delta del change, otra al fundirse en la spec viva. Entre archivar y no archivar hay un paso manual, y si se salta, la spec viva queda desfasada sin que nada lo avise — que es exactamente lo que le pasó al requisito de la lista compartida durante el tiempo entre que FS-142 se implementó y que `add-task-status-filter` se archivó.
- No existe ningún check automático que falle la build si la spec viva y el código divergen (a diferencia, por ejemplo, de lo que un comando tipo `openapi:check` podría hacer con el documento OpenAPI): la coherencia depende por completo de que quien cierra el change se acuerde de hacerlo y lo haga bien.
- Las tres delta-specs archivadas documentan comportamiento sin ningún test que lo respalde — `add-task-list`, `add-task-status-filter` y `add-task-due-date` lo declaran a propósito en su `proposal.md`. La spec viva describe el contrato con precisión, pero nada la ejecuta contra el sistema real: es documentación, no verificación.
- El repositorio acumula dos capas de historia por capability: los directorios de `changes/archive/` y la propia `spec.md` fundida. Entender por qué un requisito dice lo que dice —por ejemplo, por qué el límite del título es 200 caracteres y no otro— a veces exige leer el `proposal.md` del change que lo introdujo, no solo la spec viva.
- Cuando dos changes tocan el mismo requisito, fundir el delta exige reescribir el requisito entero — el formato de delta trabaja sobre el `Requirement` completo, no sobre líneas sueltas —, lo que es más caro de revisar en un diff que un cambio de código equivalente.
- La spec viva documenta la intención, pero no ata el código a cumplirla: el propio `proposal.md` de `add-task-status-filter` señala que `DEFAULT_LIST_STATUSES` está escrito por duplicado en backend y frontend y que «nada lo comprueba automáticamente» — la spec dice qué debe coincidir, no lo hace coincidir.
