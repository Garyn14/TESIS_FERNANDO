# E6: Notificaciones

**Objetivo:** Informar a cada rol de los eventos que requieren su intervención.
**Requerimientos:** RF46–RF48 · **Sprint:** 6 · **Fuente:** Tabla 22 de la tesis.

---

## HU26: Aviso de documento pendiente al director

**Como** director, **quiero** recibir un aviso cuando un documento queda pendiente de mi revisión, **para** atenderlo a tiempo.

**Contexto**

Hasta ahora el Director tenía que entrar a "Por revisar" para enterarse de los documentos nuevos. Esta historia construye los **avisos dentro de la plataforma**: una campana en el encabezado con la cantidad sin leer y un panel con los avisos. HU27 y HU28 usarán los mismos avisos para el Área encargada y Mesa de Partes.

Un documento queda pendiente de revisión en cuatro casos, y en cada uno se avisa a los directores activos:

| Cuándo | Aviso | Abre |
|---|---|---|
| El área envía un documento a solicitud de parte (HU08) | "Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto" | El documento en Por revisar |
| El área envía un lote (HU09) | "Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)" | El lote en Por revisar |
| El área corrige y reenvía un observado (HU15) | "Documento corregido, pendiente de revisión: Certificado de Trabajo – Lucía Paredes Quinto" | El documento, o su lote |
| El área envía una reemisión (HU30) | "Reemisión pendiente: Certificado de Trabajo – Lucía Paredes Quintana (reemplaza a DRA-2026-F8R2MA)" | El documento en Por revisar |

**Criterios de aceptación**

El primero es el de la Tabla 22 de la tesis. Los demás detallan cómo se cumple.

- [ ] El aviso aparece dentro de la plataforma y abre el documento o lote correspondiente.
  - Al pulsarlo se marca como leído y se abre el documento (`#/por-revisar/{código}`) o el lote (`#/por-revisar/lote/{número}`), como desde la bandeja.
  - Un lote genera **un solo aviso**, no uno por certificado.
- [ ] El encabezado tiene una **campana** ("Avisos") para quien tiene el permiso `NOTIFICACIONES_VER`. Muestra la cantidad de avisos sin leer, o nada si no hay.
- [ ] La campana abre un **panel** con los 30 avisos más recientes:
  - cada uno con su texto y su antigüedad ("hace 5 min", "hace 2 h", "ayer", o la fecha);
  - un punto en los que no se leyeron;
  - el botón "Marcar todos como leídos";
  - sin avisos, el mensaje "No tiene avisos.".
  - Se cierra con Escape o al pulsar fuera.
- [ ] Los avisos nuevos aparecen sin recargar la página: se consultan al cambiar de pantalla, al abrir la campana y al volver a la ventana de la plataforma. No se consultan a intervalos, porque cada consulta cuenta como actividad y la sesión dejaría de cerrarse por inactividad (HU03).
- [ ] Cada aviso es de una persona: cada director tiene los suyos y los marca como leídos por su cuenta. Nadie ve ni marca los avisos de otra persona.
- [ ] El aviso se guarda en la misma transacción que el envío: si el envío falla, no hay aviso.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Avisos al Área encargada (firmado, observado, rechazado, anulado) | HU27 |
| Avisos a Mesa de Partes (listo para entregar, rechazado) | HU28 |
| Avisos por correo o por otro medio fuera de la plataforma | No está en la tesis: los avisos son internos (RF46) |
| Borrar avisos o guardarlos por un tiempo limitado | Pregunta abierta al PO: hoy se conservan todos |

**Notas técnicas**

- Migración V22: tabla `aviso` (destinatario, tipo, texto, enlace, creado_en, leido_en), con un índice por destinatario y fecha.
- API, con el permiso `NOTIFICACIONES_VER`:
  - `GET /api/avisos`: `{ avisos, sinLeer }`, los 30 más recientes de la persona;
  - `POST /api/avisos/{id}/lectura`: marca un aviso como leído;
  - `POST /api/avisos/lectura`: marca todos como leídos.
- Un aviso de otra persona responde 404, igual que uno inexistente.
- Servicio `Avisos` con un método por destinatario (directores, área, Mesa de Partes) para HU26–HU28.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF46 |

## HU27: Avisos de resultado al Área encargada

**Como** Área encargada, **quiero** recibir un aviso cuando un documento es firmado, observado, rechazado o anulado, **para** actuar en consecuencia.

**Contexto**

Con HU26 la plataforma ya tiene avisos y una campana en el encabezado. Esta historia avisa al **Área encargada** del resultado de lo que envió. El aviso llega a cada persona activa del área del documento (rol Área encargada), y no solo a quien lo registró, porque cualquiera del área puede corregirlo o reemitirlo.

| Cuándo | Aviso | Abre |
|---|---|---|
| Se firma un documento (HU11) | "Firmado: Certificado de Trabajo – Lucía Paredes Quinto" | El documento en Mis documentos |
| El Director lo observa (HU13) | "Observado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento, para corregirlo |
| El Director lo rechaza (HU14) | "Rechazado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento |
| Se anula en la blockchain (HU29), o al firmarse su reemisión (HU30) | "Anulado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento |

**Criterios de aceptación**

El primero es el de la Tabla 22 de la tesis. Los demás detallan cómo se cumple.

- [ ] El aviso incluye el motivo cuando corresponde y abre el documento.
  - La observación, el rechazo y la anulación llevan su motivo. Un motivo largo se corta en el aviso y se lee completo en el documento.
  - Al pulsarlo se marca como leído y se abre el documento en Mis documentos (`#/mis-documentos/{código}`). En un lote, se abre el lote (`#/mis-documentos/lote/{número}`).
- [ ] **Un lote genera un solo aviso** por firma o por decisión, con la cantidad de certificados:
  - "Lote 2026-001 – Manejo integrado de plagas en café: 3 certificados firmados";
  - "Lote 2026-001 – …: 2 certificados observados. Motivo: …".
  - Si la firma de un lote se confirma en partes (por ejemplo, la confirmación y la sincronización con la blockchain), el aviso de esa transacción se actualiza con la cantidad final y vuelve a quedar sin leer, en vez de repetirse.
- [ ] El aviso llega a cada persona activa del área del documento con el rol Área encargada. No llega a otras áreas, al Director ni a Mesa de Partes.
- [ ] El aviso se guarda en la misma transacción que el cambio de estado: si el cambio no se guarda, no hay aviso. Repetir una confirmación que ya se aplicó no genera otro aviso.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Avisos a Mesa de Partes (listo para entregar, rechazado) | HU28 |
| Avisar a una persona que ya no está en el área cuando se envió el documento | Pregunta abierta al PO: hoy se avisa a quienes están en el área en el momento del resultado |

**Notas técnicas**

- `TipoDeAviso`: FIRMADO, OBSERVADO, RECHAZADO y ANULADO.
- Migración V23: columna `clave` en `aviso`, única por destinatario. Un aviso con la misma clave se actualiza en lugar de repetirse. Las claves son la transacción para la firma de un lote y el cambio de estado para lo demás.
- Los avisos se crean donde ya se aplica cada cambio: la confirmación de la firma y la sincronización (`FirmaDeDocumentos.aplicar`), la anulación (`AnulacionDeDocumentos.aplicar`) y la revisión del Director (`RevisionDelDirector`).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF47 |

## HU28: Avisos de entrega y rechazo a Mesa de Partes

**Como** personal de Mesa de Partes, **quiero** recibir un aviso cuando un documento está listo para su entrega o es rechazado, **para** imprimirlo o comunicar el rechazo al solicitante.

**Criterios de aceptación**
- [ ] El aviso de rechazo incluye el motivo y el número de expediente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF48 |
