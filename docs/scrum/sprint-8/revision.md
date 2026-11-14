# Revisión del Sprint 8

- **Sprint:** 8, del 13/11 al 20/11/2026. El trabajo terminó el 14/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** preparar la operación de PROD y dar la primera ayuda a los usuarios.
- **Resultado:** 6 de 6 historias construidas, con 21 puntos. El Sprint se cerró el 14/11/2026 **sin la validación del PO**, que queda para el final del proyecto (DRA-48; ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

**Este Sprint está fuera del backlog original de la tesis**, igual que el Sprint 7. Atiende dos frentes:
- **requisitos antes de PROD** (etiqueta `antes-de-prod`): respaldos (DRA-66) y monitoreo (DRA-68). Se construyeron en la plantilla de AWS detrás de un interruptor, se probaron en QA y quedaron **apagados** hasta PROD (DRA-65);
- **la épica E8 · Ayuda y documentación (DRA-69):** la guía y las preguntas frecuentes del portal, el manual de usuario general y la guía de operación del Administrador. El contenido vive en el repositorio; no se usa Confluence.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| Respaldos y recuperación | DRA-66 | 5 | Copia diaria del disco completo (base de datos, PDF y blockchain) a las 03:00 de Lima, con 30 días de retención, y un volcado de PostgreSQL. Disparadores **"QA – Respaldar ahora"** y **"QA – Restaurar respaldo"**. En QA se simuló la pérdida de los datos y se restauraron en menos de 4 minutos | [DRA-66](../../evidencias/sprint-8/DRA-66/) |
| Monitoreo y alertas | DRA-68 | 5 | Un vigilante revisa cada minuto la plataforma, la blockchain, el IPFS y el disco. Hay 5 alarmas por correo, al fallar y al recuperarse, y un aviso si falla una copia. En QA las alertas llegaron a los 6 y 7 minutos de detener los servicios | [DRA-68](../../evidencias/sprint-8/DRA-68/) |
| "¿Cómo verificar un documento?" | DRA-70 | 2 | Guía del portal (`/como-verificar`): el QR, el código, un dibujo de dónde están y qué significa cada uno de los 6 resultados | [DRA-70](../../evidencias/sprint-8/DRA-70/) |
| Preguntas frecuentes del portal | DRA-71 | 3 | 15 preguntas en tres grupos (`/preguntas-frecuentes`), que se abren con un clic y tienen su propio enlace | [DRA-71](../../evidencias/sprint-8/DRA-71/) |
| Manual de usuario general (versión 1) | DRA-75 | 3 | **Manual de usuario** en el menú de todos los roles, con una sección por rol, 4 capturas e impresión a PDF. El inicio lleva a la sección de cada rol | [DRA-75](../../evidencias/sprint-8/DRA-75/) |
| Guía de operación | DRA-74 | 3 | **Guía de operación**, solo para el Administrador: calendario de tareas, disparadores, respaldos, alertas, seguridad, costos y qué hacer ante un incidente | [DRA-74](../../evidencias/sprint-8/DRA-74/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe las cuatro historias de ayuda y revise las dos de infraestructura.
- **Validación pendiente de los Sprints 3 a 7 (DRA-48):** los guiones del [Sprint 3](../sprint-3/guion-de-pruebas.md), del [Sprint 4](../sprint-4/guion-de-pruebas.md), del [Sprint 5](../sprint-5/guion-de-pruebas.md), del [Sprint 6](../sprint-6/guion-de-pruebas.md) y del [Sprint 7](../sprint-7/guion-de-pruebas.md).
- **Evidencia por historia:** [docs/evidencias/sprint-8](../../evidencias/sprint-8/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint8.cjs](../../../plataforma/e2e/sprint8.cjs), con **17 de 17 pasos**.
  - Recorre la ayuda del portal y de la plataforma con el navegador, el backend y la red Besu reales, con una firma real del Director.
  - El menú de todos los roles cambió (DRA-75), así que se corrieron las pruebas de los Sprints 1 a 7. Pasaron sus 32, 23, 34, 32, 17, 30 y 26 pasos.
- **Respaldos y monitoreo:** se probaron en **QA en AWS**, con su evidencia. Los documentos técnicos son [respaldos.md](../../arquitectura/respaldos.md) y [monitoreo.md](../../arquitectura/monitoreo.md).

## Decisiones a validar

Las tomé al refinar o al construir cada historia, y el responsable del proyecto las validó antes de construirlas. El sistema ya funciona así. Si el PO pide cambiar alguna, se registra como un ticket nuevo.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | DRA-66 | **Copia del disco completo**, no de cada servicio | Guarda la base de datos, los PDF y la blockchain en el mismo instante, siempre coherentes |
| 2 | DRA-66 | **Una copia diaria a las 03:00, con 30 días** | Se pierde como máximo un día de trabajo; se ajusta con una variable |
| 3 | DRA-66 | **Restaurar vuelve todo atrás, la blockchain incluida**, y el Director restablece MetaMask | Hoy la red tiene un solo operador (trabajo futuro: validadores en otras instituciones) |
| 4 | DRA-66 y DRA-68 | **Apagados en QA**: se encienden solo para probarlos y quedan para PROD | QA se apaga de noche; no necesita copias ni alertas |
| 5 | DRA-68 | **Servicios de AWS** (CloudWatch, SNS y EventBridge), sin un servidor de monitoreo propio | Nada más que mantener; **costo $0** en la capa gratuita |
| 6 | DRA-68 | **Aviso tras unos 10 minutos de falla** (dos ventanas de 5 minutos), con un vigilante que reporta cada minuto | Evita alertas por cortes de segundos y por reportes retrasados |
| 7 | DRA-68 | **El correo de alertas está en la pila de la cuenta**, el mismo del presupuesto | El correo no queda en el repositorio público |
| 8 | DRA-68 | **Se vigila desde dentro del servidor**; CloudFront y S3 quedan fuera | La comprobación externa cuesta aparte |
| 9 | DRA-70 y DRA-71 | **Páginas propias del portal** (`/como-verificar`, `/preguntas-frecuentes`), con enlaces desde la portada, el pie y los resultados | Se pueden compartir por enlace |
| 10 | DRA-70 | **Un dibujo del certificado**, no una captura real | Sin datos de nadie y sin rehacerlo si cambia el PDF |
| 11 | DRA-71 | **Cada pregunta tiene su enlace**, que la abre directamente | La agencia puede responder una consulta con el enlace |
| 12 | DRA-75 | **Un solo manual para todos (versión 1)**, en Markdown en el repositorio; la versión por rol con capturas de cada paso es DRA-72 | No rehacerlo si la validación del PO cambia pantallas |
| 13 | DRA-75 | **Los nombres del manual son los de la pantalla**, comprobados por una prueba | Algunos nombres del documento de negocio no coincidían |
| 14 | DRA-74 | **La guía de operación resume y remite** a los documentos técnicos, y **no tiene claves ni correos** | Una sola versión de cada cosa; el código es público |

**Preguntas nuevas al PO:**

1. **¿Cuáles son los datos de atención de la agencia?** Teléfono, correo y dirección, para la guía y las preguntas frecuentes del portal (DRA-70, DRA-71).
2. **¿Cómo se pide una copia nueva de un documento**, cuánto cuesta y en qué plazo? (DRA-71)
3. **¿A quién debe avisar el responsable de sistemas ante un incidente?** Los contactos de soporte y de la DRA (DRA-74).
4. **¿Basta una copia diaria**, o la agencia necesita copias más frecuentes? (DRA-66)
5. **¿Quién recibe las alertas en PROD?** Hoy van al correo del presupuesto de la cuenta (DRA-68).

**Preguntas abiertas de Sprints anteriores:** las del [Sprint 7](../sprint-7/revision.md#decisiones-a-validar) y anteriores siguen sin respuesta. Destacan las áreas reales de la agencia, los tipos de documento que vencen y el dominio del portal.

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| **Suscripción del correo de alertas** | El dueño del correo de alertas debe confirmar la suscripción ("AWS Notification - Subscription Confirmation"). Después se comprueba la entrega con un aviso de prueba | Antes de activar el monitoreo en PROD |
| Validación del PO de los Sprints 3 a 8 (DRA-48) | Las historias se cerraron sin las pruebas del PO | Al final del proyecto |
| DRA-72 y DRA-73 | Manual por rol (versión 2) y preguntas frecuentes de la plataforma | Después de DRA-48 |
| DRA-67 (datos personales) | Bloqueado por decisión del equipo | Al final del proyecto |
| DRA-63 (billetera del Director) y DRA-65 (PROD) | El spike de seguridad, y el dominio y el alcance de PROD | Antes de PROD |
| Clave temporal de AWS `claude-sesion` | Sigue activa, con permisos de administrador (se usó para actualizar la pila de la cuenta en este Sprint) | Eliminarla cuando ya no se necesite |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con los **7 jobs** en verde:
  - 43363379389 y 43365027715 (DRA-66);
  - 43439220037 y 43441320683 (DRA-68);
  - 43619753637 (DRA-70);
  - 43621453585 (DRA-71);
  - 43623215214 (DRA-75);
  - 43627117530 (DRA-74).
- **Pruebas automáticas al cierre** (según la CI 43627117530; al empezar el Sprint, según la CI 43076723574 del Sprint 7):

  | Prueba | Al empezar | Al cierre |
  |---|---|---|
  | Backend | 272 | 272 |
  | Frontend | 199 | 212 |
  | Portal | 13 | 28 |
  | Contrato | 28 | 28 |
  | Terraform | 11 | 18 |
  | Cuenta | 11 | 14 |
  | CloudFront | 4 | 4 |
  | Disparadores | 26 | 46 |
  | Servidor | 16 | 27 |
- **Sin migraciones nuevas.** Dependencias nuevas del frontend: `react-markdown` y `remark-gfm`.
- **Problemas reales encontrados y corregidos:**
  - "Respaldar ahora" fallaba en AWS porque el disco ya traía la etiqueta `Ambiente`, y el error quedaba oculto tras `| tee` (DRA-66);
  - el disco restaurado llega sin etiquetas: Encender se las devuelve sin reemplazar el servidor (DRA-66);
  - con un reporte cada 5 minutos, la alarma de la plataforma daba falsas alarmas por ventanas vacías; ahora el vigilante reporta cada minuto (DRA-68);
  - tras una parada larga, la red Besu tardó 17 minutos en reanudarse; quedó documentado (DRA-68);
  - las capturas del manual movían la página al cargar, y copiarlas durante la prueba recargaba la plataforma (DRA-75);
  - varias pruebas de punta a punta buscaban enlaces por un nombre que ahora coincide con otro (DRA-70, DRA-71).

## Acta

- **Cierre del Sprint 8:** 14/11/2026, por decisión del equipo, **sin la validación del PO**, igual que en los Sprints 3 a 7.
- **Cómo se cerró:** las 6 historias están construidas, integradas a `main` con la CI en verde (7 jobs) y verificadas con la prueba de punta a punta o, las de infraestructura, en QA.
- **En Jira:** las 6 historias pasaron a **Listo**, con un comentario de cierre que deja constancia de que la validación del PO está pendiente, y el Sprint 8 se cerró el 14/11/2026. El conector se desconectó a mitad del Sprint: lo pendiente se guardó en [pendiente-jira.md](pendiente-jira.md) y se registró en cuanto volvió.
- **Validación pendiente:** el PO probará los Sprints 3 a 8 **al final del proyecto**, en **DRA-48**. **Cada observación del PO se registrará como un ticket nuevo**; las historias cerradas no se reabren.
- **Quedan en el backlog:**
  - DRA-48 (validación del PO);
  - DRA-63 (spike de la billetera);
  - DRA-65 (PROD en AWS);
  - DRA-67 (datos personales, bloqueado);
  - DRA-72 y DRA-73 (ayuda de la plataforma, después de DRA-48).

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| Respaldos y recuperación | DRA-66 | 5 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |
| Monitoreo y alertas | DRA-68 | 5 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |
| "¿Cómo verificar un documento?" | DRA-70 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |
| Preguntas frecuentes del portal | DRA-71 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |
| Manual de usuario general (versión 1) | DRA-75 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |
| Guía de operación | DRA-74 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 14/11; validación en DRA-48 |

**Resultado:** 6 de 6 historias cerradas, con 21 puntos. En Jira, el Sprint 8 se cerró el 14/11/2026. La velocidad del Sprint 8 es de 21 puntos. Sumados a los 172 cerrados hasta el Sprint 7, son **193 puntos**.
