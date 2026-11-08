# Revisión del Sprint 6

- **Sprint:** 6, del 08/11 al 15/11/2026. El trabajo terminó el 08/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** implementar la consulta interna, la auditoría y las notificaciones.
- **Resultado:** 7 de 7 historias cerradas, con 19 puntos. El Sprint se cerró el 08/11/2026 **sin la validación del PO**, que queda para el final del proyecto (DRA-48; ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

Con este Sprint se completan **todas las historias de la tesis** (HU01–HU30). Mesa de Partes ya puede ubicar cualquier documento, explicarle al ciudadano en qué estado está, demostrar su trazabilidad con la blockchain y entregarlo impreso. Cada rol recibe además avisos dentro de la plataforma de lo que requiere su intervención.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| HU22: Buscar documentos | DRA-35 | 3 | **Buscar documentos** de todas las áreas por nombre (parcial, sin tildes, en cualquier orden), DNI, código, expediente o lote, con filtros por estado. Los lotes se despliegan en sus certificados | [HU22](../../evidencias/sprint-6/HU22/) |
| HU23: Ver el estado de un documento | DRA-36 | 2 | La **ficha** de un documento: su estado explicado para el ciudadano, sus fechas, el motivo y los datos básicos, con las reemisiones enlazadas | [HU23](../../evidencias/sprint-6/HU23/) |
| HU24: Consultar el historial y la auditoría | DRA-37 | 5 | El **historial** con fecha, hora y responsable de cada evento, y el **detalle técnico** plegado (hash, CID, transacciones, billetera, contrato), comprobado contra IPFS y la red Besu | [HU24](../../evidencias/sprint-6/HU24/) |
| HU25: Descargar o imprimir un documento | DRA-38 | 3 | **Ver, descargar e imprimir** el PDF firmado, comprobado antes con la blockchain y sin una nueva firma. Cada entrega queda en el historial, y la reimpresión, como **duplicado**. Filtro "Listos para entregar" | [HU25](../../evidencias/sprint-6/HU25/) |
| HU26: Aviso de documento pendiente al director | DRA-39 | 2 | **Avisos dentro de la plataforma** (campana con la cantidad sin leer) y el aviso al Director de cada documento o lote pendiente | [HU26](../../evidencias/sprint-6/HU26/) |
| HU27: Avisos de resultado al Área encargada | DRA-40 | 2 | Avisos al área de cada firmado, observado, rechazado y anulado, con el motivo. Un solo aviso por lote | [HU27](../../evidencias/sprint-6/HU27/) |
| HU28: Avisos de entrega y rechazo a Mesa de Partes | DRA-41 | 2 | Avisos a Mesa de Partes de lo que está **listo para entregar** y de lo **rechazado**, con el expediente y el motivo | [HU28](../../evidencias/sprint-6/HU28/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe la consulta interna y los avisos, y deje su ok en Jira.
- **Validación pendiente de los Sprints 3, 4 y 5 (DRA-48):** guiones del [Sprint 3](../sprint-3/guion-de-pruebas.md), del [Sprint 4](../sprint-4/guion-de-pruebas.md) y del [Sprint 5](../sprint-5/guion-de-pruebas.md). Conviene hacerlos antes, en la misma sesión: dejan documentos firmados, rechazados, anulados y reemitidos que luego se buscan y se entregan en este guion.
- **Evidencia por historia:** [docs/evidencias/sprint-6](../../evidencias/sprint-6/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint6.cjs](../../../plataforma/e2e/sprint6.cjs), 30 de 30 pasos.
  - Usa el navegador, la red Besu, IPFS y PostgreSQL reales, con firmas y anulaciones con la billetera del Director.
  - Las pruebas de los Sprints 1 a 5 siguen pasando sus 32, 23, 34, 32 y 17 pasos.

## Cómo levantar la demostración

Igual que en el Sprint 5:

```bash
cd plataforma
./e2e/levantar.sh demo
```

La plataforma queda en <http://localhost:5173>. Para la validación de los Sprints 3 a 5 en la misma sesión, con el portal en el celular, se agrega `PLATAFORMA_PORTAL_URL=http://<IP de la computadora>:5174` antes del comando.

## Decisiones a validar

Las tomé al refinar o al construir cada historia. El sistema ya funciona así; si el PO pide cambiar alguna, se registra como un ticket nuevo.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | HU22 | La búsqueda cubre **todos los documentos de todas las áreas, en cualquier estado**, no solo los firmados como en el prototipo | El ciudadano también pregunta por los que siguen en trámite |
| 2 | HU22 | Filtros Todos, En trámite (Pendiente, Procesando firma y Observado), Firmados, Anulados y Rechazados. "Listos para entregar" llegó con HU25 | Los estados que Mesa de Partes explica al ciudadano |
| 3 | HU22 | Hasta **50 filas**, con un aviso para precisar la búsqueda; desde **2 caracteres**; sin texto, los más recientes | Respuesta rápida y una tabla legible |
| 4 | HU22 | El DNI va debajo del nombre del beneficiario | Para que la tabla quepa a 1280 px con el estado visible |
| 5 | HU23 | El texto de la **explicación de cada estado** (por ejemplo, "Está en revisión del Director. Todavía no se puede entregar.") | Es lo que Mesa de Partes le dice al ciudadano |
| 6 | HU23 | Mesa de Partes ve el **motivo** de la observación, del rechazo o de la anulación | Para explicárselo al ciudadano |
| 7 | HU23 | Mesa de Partes ve el **código de la reemisión** que reemplazó a un documento (el portal público no lo muestra, RF41) | Es personal interno y debe entregar la versión corregida |
| 8 | HU24 | El historial y el detalle técnico están **en la ficha**, no en una pantalla aparte | Como en el prototipo |
| 9 | HU24 | El detalle de cada evento se muestra **tal como se guardó**, con sus transacciones | Es el registro auditable; no se reescribe |
| 10 | HU25 | **Antes de cada entrega se verifica el documento con la blockchain**, como en el portal; si no coincide o está anulado, no se entrega | Mesa de Partes nunca imprime un documento alterado o anulado |
| 11 | HU25 | **La descarga también se registra** como entrega; "Ver documento" no | La descarga también entrega el documento al ciudadano |
| 12 | HU25 | Desde la segunda impresión, el historial la marca como **duplicado** | RF45: duplicados sin reiniciar el trámite |
| 13 | HU26 | Los avisos son **de cada persona**: cada uno los marca como leídos por su cuenta | Si hay dos directores, cada uno lleva su control |
| 14 | HU26 | La campana **no consulta a intervalos**: los avisos se actualizan al cambiar de pantalla, al abrir la campana y al volver a la ventana | Una consulta periódica mantendría la sesión abierta y anularía el cierre por inactividad (HU03) |
| 15 | HU26–HU28 | **Un lote genera un solo aviso** por envío, firma o decisión, con la cantidad de certificados | Un lote puede tener decenas de certificados |
| 16 | HU27 | El aviso de resultado llega a **todo el Área encargada**, no solo a quien registró el documento | Cualquiera del área puede corregirlo o reemitirlo |
| 17 | HU28 | En un lote, el **número de lote** reemplaza al expediente en el aviso de rechazo | Los certificados de oficio no tienen expediente |
| 18 | HU28 | La observación y la anulación **no** se avisan a Mesa de Partes | La observación sigue en trámite; la anulación la avisa HU27 al área |

**Preguntas nuevas al PO:**

1. ¿Se debe registrar **quién busca o consulta** cada documento? Hoy no se registra (HU22, HU24).
2. ¿Hace falta **"Imprimir lote"**, para imprimir todos los certificados de un lote de una vez, como en el prototipo? Hoy se imprime certificado por certificado (HU25).
3. ¿Hacen falta los indicadores del prototipo **"Impresos esta semana"** y **"Duplicados emitidos"**? (HU25)
4. ¿Hay que **borrar los avisos antiguos** o conservarlos por un tiempo limitado? Hoy se conservan todos y el panel muestra los 30 más recientes (HU26).
5. Si alguien **cambia de área**, ¿debe seguir recibiendo los avisos de lo que envió antes? Hoy se avisa a quienes están en el área en el momento del resultado (HU27).
6. ¿También hay que **avisar a Mesa de Partes cuando se anula** un documento? (HU28)

**Preguntas abiertas de Sprints anteriores**, todavía sin respuesta:

- **Sprint 5:** el dominio del portal (va impreso en cada PDF).
- **Sprint 2:**
  - formato del número de expediente;
  - campos y textos de cada documento a solicitud de parte;
  - columnas de la lista real de beneficiarios.
- **Sprint 1:**
  - nombres de las áreas;
  - nombre oficial en pantalla;
  - custodia de la billetera de respaldo.

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Validación del PO de los Sprints 3 a 6 (DRA-48) | Las 21 historias se cerraron sin las pruebas del PO | Al final del proyecto, en una sola sesión |
| Infraestructura en AWS (DRA-44) | El portal solo funciona en la red local. Para el público hacen falta un servidor, un dominio y un certificado HTTPS. Sigue diferida para no gastar crédito | Antes de emitir documentos reales |
| Dominio del portal | Va impreso en cada PDF: un documento emitido con otra dirección no se puede cambiar | Antes de emitir documentos reales |
| Tabla 26 de la tesis | Actualizar las fechas de los sprints con el calendario reprogramado de [jira.md](../../requerimientos/jira.md) | Al redactar el informe final |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con los 6 jobs en verde (ejecuciones 42438087410, 42439796088, 42441312094, 42443272623, 42444614347, 42446007661 y 42448485785).
- **Pruebas automáticas al cierre** (según la CI 42448485785):
  - 240 de backend;
  - 11 del portal;
  - 180 de frontend;
  - 28 del contrato.
- **Migraciones nuevas:** V21 (eventos de impresión y descarga), V22 (avisos) y V23 (clave de los avisos).
- **Problemas reales encontrados en la verificación y corregidos:**
  - la columna Estado de Buscar documentos quedaba fuera de la vista a 1280 px; la tabla se compactó y la prueba lo comprueba (HU22);
  - la reimpresión aparecía en el historial con el mismo título que la primera impresión; ahora se titula "Duplicado impreso" (HU25);
  - el refinamiento de HU26 proponía consultar los avisos cada 30 segundos, lo que habría impedido el cierre de la sesión por inactividad; se cambió antes de construirlo.

## Acta

- **Cierre del Sprint 6:** 08/11/2026, por decisión del equipo, **sin la validación del PO**, igual que en los Sprints 3, 4 y 5.
- **Cómo se cerró:** las 7 historias estaban construidas, integradas a `main` con la CI en verde (6 jobs) y verificadas con la prueba de punta a punta. Pasaron a **Listo** en Jira, con un comentario que deja constancia de que la validación del PO está pendiente.
- **Validación pendiente:** el PO probará los Sprints 3, 4, 5 y 6 **al final del proyecto**, en la tarea **DRA-48** ("Validación final del PO de los Sprints 3 a 6"), con los guiones de cada Sprint. **Cada observación del PO se registrará como un ticket nuevo**; las historias cerradas no se reabren.
- **DRA-48 y DRA-44** quedan en el backlog: no hay un Sprint 7 planificado en la tesis.

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU22: Buscar documentos | DRA-35 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU23: Ver el estado de un documento | DRA-36 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU24: Consultar el historial y la auditoría | DRA-37 | 5 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU25: Descargar o imprimir un documento | DRA-38 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU26: Aviso de documento pendiente al director | DRA-39 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU27: Avisos de resultado al Área encargada | DRA-40 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |
| HU28: Avisos de entrega y rechazo a Mesa de Partes | DRA-41 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 08/11; validación en DRA-48 |

**Resultado:** 7 de 7 historias cerradas, con 19 puntos. En Jira, el Sprint 6 se cerró el 08/11/2026. La velocidad del Sprint 6 es de 19 puntos. Con los Sprints 1 a 6 se cerraron **156 de 156 puntos (100 %)**: todas las historias del backlog.
