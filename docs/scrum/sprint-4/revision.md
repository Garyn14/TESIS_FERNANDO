# Revisión del Sprint 4

- **Sprint:** 4, previsto del 17/11 al 23/11/2026. El trabajo se adelantó y terminó el 04/11, mientras el Sprint 3 esperaba su revisión. En Jira, el Sprint 4 todavía no está iniciado.
- **Objetivo (Jira):** observar, rechazar, corregir, anular y reemitir documentos.
- **Resultado:** 5 de 5 historias construidas e integradas, con 27 puntos, todas **En revisión**. Falta la aprobación del PO (ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

Con este Sprint, la plataforma cubre lo que pasa cuando un documento tiene un error:

- **antes de firmarse:** el Director lo observa y el área lo corrige y reenvía, o lo rechaza de forma definitiva;
- **después de firmado:** el Director puede anularlo, o el área puede reemitirlo con los datos corregidos. La anulación queda en la blockchain, y la reemisión anula al original en la misma transacción.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| HU13: Observar un documento | DRA-27 | 3 | El Director observa un documento a solicitud de parte con un motivo obligatorio. El documento vuelve al área con el motivo y sale de Por revisar | [HU13](../../evidencias/sprint-4/HU13/) |
| HU14: Rechazar un documento | DRA-28 | 3 | El Director rechaza con un motivo obligatorio y el aviso de que es definitivo. No se vuelve a revisar, observar ni corregir | [HU14](../../evidencias/sprint-4/HU14/) |
| HU15: Corregir y reenviar un documento observado | DRA-29 | 5 | El área corrige el documento observado (o un certificado observado de un lote) con el formulario precargado y lo reenvía con el mismo código. El Director lo ve como "Corregido" y lo revisa de nuevo | [HU15](../../evidencias/sprint-4/HU15/) |
| HU29: Anular un documento firmado | DRA-30 | 8 | Pantalla **Documentos firmados** y anulación con motivo y la billetera del Director. La anulación queda en el contrato; si se cancela, el documento sigue firmado. La sincronización la aplica aunque el navegador se cierre | [HU29](../../evidencias/sprint-4/HU29/) |
| HU30: Reemitir un documento con datos corregidos | DRA-31 | 8 | El área reemite un firmado con los datos corregidos y un motivo. El Director ve los cambios, y al firmar, **una sola transacción** registra la reemisión y anula el original | [HU30](../../evidencias/sprint-4/HU30/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe cada historia, con MetaMask real, y deje su ok en Jira. Si el Sprint 3 todavía no se revisó, los dos guiones se pueden seguir en una sola sesión.
- **Evidencia por historia:** [docs/evidencias/sprint-4](../../evidencias/sprint-4/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint4.cjs](../../../plataforma/e2e/sprint4.cjs), con Besu, IPFS y PostgreSQL reales y una billetera de prueba que firma transacciones reales. Pasa sus 32 de 32 pasos. Las pruebas de los Sprints 1 a 3 siguen pasando sus 32, 23 y 34 pasos.

## Cómo levantar la demostración

```bash
cd plataforma
./e2e/levantar.sh demo
```

Es el mismo comando del Sprint 3. Para ver lo que la pantalla todavía no muestra, ejecute `./e2e/ver-registro.sh` o `./e2e/ver-registro.sh <código>`. Desde este Sprint también muestra los anulados, con la transacción de su anulación y el documento que los reemplazó. La pantalla de auditoría llega con HU24.

## Decisiones a validar

Las tomé al refinar cada historia. El sistema ya funciona así; si el PO pide cambiar alguna, se corrige en el Sprint 5.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | HU13, HU14 | Motivo obligatorio, de hasta 500 caracteres, como en los lotes (HU12) | RF24–RF26 |
| 2 | HU14 | El aviso del rechazo a Mesa de Partes (tercer criterio de la tesis) llega con HU28 | Los avisos son del Sprint 6. El rechazo ya queda con su motivo y su historial para informarlo |
| 3 | HU15 | El documento corregido conserva su código y **pierde la revisión anterior**: el Director debe abrirlo de nuevo antes de firmarlo | Para que no se firme sin ver lo que cambió |
| 4 | HU15 | En un certificado de lote solo se corrigen nombres, apellidos y DNI, y el DNI no se repite en el lote | Los datos del evento son comunes a todo el lote |
| 5 | HU29 | Se anula desde la pantalla **Documentos firmados**, con un botón por documento (en un lote, por certificado) | Como en el prototipo |
| 6 | HU29 | El motivo de la anulación **no va a la blockchain**: queda en la base y en el historial | Puede tener datos personales |
| 7 | HU29 | El servidor guarda el motivo antes de ir a la billetera. Si se cancela, se descarta; si el navegador se cierra, la sincronización anula con ese motivo | Para no perder el motivo de una anulación ya registrada |
| 8 | HU30 | La reemisión es un **documento nuevo**, con otro código y el mismo número de expediente, que no se puede cambiar | "Sin reiniciar el trámite"; el código y el QR del original siguen existiendo, anulados |
| 9 | HU30 | Debe cambiar al menos un dato, y el motivo es obligatorio | Una reemisión sin cambios no corrige nada |
| 10 | HU30 | Un certificado de lote se reemite en el mismo lote y solo cambia nombres, apellidos y DNI. **Corregir los datos del evento queda fuera** | Son comunes a todos los certificados. Si el PO lo necesita, sería una historia nueva |
| 11 | HU30 | Mientras la reemisión está en curso, el original sigue Firmado y **no se anula por separado**. Si la reemisión se rechaza, el original sigue Firmado y se puede volver a reemitir | Para que el original no quede anulado sin reemplazo |
| 12 | HU30 | Si una selección tiene reemisiones y documentos nuevos, la billetera pide **una operación para cada grupo** | La reemisión usa su propia función del contrato (`registrarReemisiones`) |

**Preguntas abiertas de Sprints anteriores**, todavía sin respuesta:

- **Sprint 2:**
  - formato del número de expediente;
  - campos y textos de cada documento a solicitud de parte;
  - columnas de la lista real de beneficiarios.
- **Sprint 1:**
  - nombres de las áreas;
  - nombre oficial en pantalla;
  - custodia de la billetera de respaldo.

Conviene cerrarlas antes de la demostración pública del Sprint 5. Los textos ya van en el PDF final y en la blockchain, y el portal los mostrará al público.

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Revisión del Sprint 3 | Sigue sin aprobación del PO (DRA-21 a DRA-26 en revisión). El Sprint 3 sigue activo en Jira y el Sprint 4 no está iniciado | En la misma sesión que esta revisión |
| Infraestructura en AWS (DRA-44) | Sigue diferida para no gastar crédito. Con varias instancias del backend, la sincronización (HU18) debe correr en una sola | Antes del portal público (Sprint 5) |
| CI sin límite de tiempo | En HU30, el paso del contrato en Besu se colgó sin salida. Se canceló y el segundo intento pasó, pero un cuelgue así puede consumir hasta 6 horas de minutos de CI | Se puede agregar `timeout-minutes` a los jobs |
| Portal público | Debe mostrar "Anulado" y "Reemplazado por". El contrato ya tiene `anulacion(codigo)` y `reemplazadoPor(codigo)` | Sprint 5 (HU19–HU21) |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con los 5 jobs en verde (ejecuciones 41784094378, 41786330073, 41789172913, 41793444955 y 41841771480). La CI registra en la red Besu real 50 documentos en una transacción y 50 reemisiones en otra.
- **Pruebas automáticas al cierre:**
  - 186 de backend;
  - 130 de frontend;
  - 28 del contrato.
- **Problemas reales encontrados en la verificación y corregidos:**
  - un motivo de 500 caracteres desbordaba el detalle del historial y la base rechazaba la observación; venía de HU12 (HU13, migración V17);
  - el motivo de anulación no alcanzaba para "Reemplazado por… Motivo de la reemisión: …" (HU30, migración V20);
  - la vista previa de la reemisión bloqueaba la fila dentro de una transacción de solo lectura (HU30).
- **Corrección de cifras:** las cantidades de pruebas de backend que registré para HU17, HU11, HU12, HU18 (Sprint 3), HU13, HU14, HU15 y HU29 tenían 3 de más. Las escribí sin tomarlas de la salida de las pruebas. Las corregí en la evidencia, en [integracion-continua.md](../../arquitectura/integracion-continua.md) y en la [revisión del Sprint 3](../sprint-3/revision.md) con lo que muestra la CI: 164 al cierre del Sprint 3, no 167. Las de frontend y contrato eran correctas. Desde HU30 la cifra se toma del registro de la CI.

## Acta

*Se completa en la reunión de revisión.*

- **Fecha de la validación:**
- **Cómo se validó:** con el [guion de pruebas](guion-de-pruebas.md). La decisión sobre cada historia queda en su ticket de Jira.

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU13: Observar un documento | DRA-27 | 3 | | |
| HU14: Rechazar un documento | DRA-28 | 3 | | |
| HU15: Corregir y reenviar un documento observado | DRA-29 | 5 | | |
| HU29: Anular un documento firmado | DRA-30 | 8 | | |
| HU30: Reemitir un documento con datos corregidos | DRA-31 | 8 | | |

## Cierre en Jira (después de la aprobación)

1. Cerrar el Sprint 3 (DRA-21 a DRA-26 en **Listo**) y mover DRA-44 al Sprint 4.
2. Iniciar el Sprint 4 y, con las aprobaciones, pasar DRA-27 a DRA-31 a **Listo**.
3. Cerrar el Sprint 4, mover DRA-44 al Sprint 5 y completar el acta en este documento y en [jira.md](../../requerimientos/jira.md).
