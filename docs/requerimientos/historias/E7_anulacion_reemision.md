# E7: Anulación y reemisión

**Objetivo:** Corregir documentos ya emitidos sin perder la trazabilidad del original.
**Requerimientos:** RF49–RF51 · **Sprint:** 4 · **Fuente:** Tabla 23 de la tesis.

---

## HU29: Anular un documento firmado

**Como** director, **quiero** anular un documento firmado indicando un motivo, **para** que deje de ser válido cuando no debió emitirse.

**Contexto**

Un documento firmado está registrado en el contrato (HU11). Anularlo también se registra en la blockchain: la billetera del Director envía la anulación al contrato, y desde ese momento la verificación pública (HU19–HU21) lo muestra como anulado. El registro original no se borra. Como en el prototipo, se anula desde la pantalla **Documentos firmados**, con el botón "Anular" de cada documento (en un lote, de cada certificado).

| Paso (como en el prototipo) | Qué ocurre |
|---|---|
| Ventana de motivo | Título "Anular documento", motivo obligatorio y el aviso "La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad." El servidor guarda el motivo antes de ir a la blockchain |
| Billetera | Se verifica la billetera y la red (como en HU11). Luego se confirma "Anular 1 documento", sin costo |
| Progreso | "Verificando su billetera", "Registrando la anulación" y "Confirmando el registro" |
| Resultado | "Documento anulado", con el código y el beneficiario |

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Solo se anulan documentos firmados.
- [ ] El motivo es obligatorio.
- [ ] La anulación se confirma desde la billetera del director.
- [ ] El portal público muestra el documento como anulado. **El portal se construye en el Sprint 5 (HU19–HU21).** Esta historia deja la anulación en el contrato, consultable con `anulacion(codigo)`, y el estado Anulado en la plataforma.
- [ ] La pantalla **Documentos firmados** lista los firmados y anulados, del más reciente al más antiguo, con su código o lote, tipo, beneficiario y DNI, área, fecha de firma y estado. Se filtra por nombre o código, y los lotes se despliegan en sus certificados.
- [ ] El contrato solo acepta la anulación de un código registrado y no anulado, y solo de una billetera con el rol de firmante. El registro original no se modifica.
- [ ] El servidor solo marca un documento como **Anulado** después de leer la transacción en la blockchain. Se guardan la transacción, el bloque, la fecha del bloque, la billetera y quién anuló. El historial registra "Anulado por [Director]…" con el motivo.
- [ ] Si el Director cancela en la billetera o la transacción falla, el documento sigue Firmado y se descarta el motivo guardado.
- [ ] Si el navegador se cierra antes de confirmar, la sincronización (HU18) lee el evento `DocumentoAnulado` y marca el documento como Anulado, con el motivo guardado.
- [ ] El Área encargada ve el documento como **Anulado** (gris, tachado) en Mis documentos y, en el detalle, el motivo.
- [ ] Solo el Director (permiso DOCUMENTO_ANULAR) anula. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Verificación pública que muestra "Anulado" | HU19–HU21 (Sprint 5) |
| Anulación automática del original al firmar su reemisión | HU30 |
| Búsqueda avanzada, historial y auditoría de los firmados | HU22–HU24 (Sprint 6) |

**Notas técnicas**

- Contrato:
  - `anularDocumento(string codigo)`, que emite `DocumentoAnulado`;
  - `anulacion(string codigo)` devuelve si está anulado y la fecha del bloque.
  - El motivo no va a la blockchain, porque puede contener datos personales. Queda en la base y en el historial.
- API:
  - `GET /api/firmados`;
  - `POST /api/anulacion/{codigo}/solicitud` con `{"motivo": "..."}`;
  - `POST /api/anulacion/{codigo}/confirmacion` con `{"transaccion": "0x…"}`;
  - `POST /api/anulacion/{codigo}/cancelacion`.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF49 |

## HU30: Reemitir un documento con datos corregidos

**Como** Área encargada, **quiero** reemitir un documento firmado con los datos corregidos, **para** reemplazarlo sin reiniciar el trámite.

**Contexto**

A veces un documento firmado tiene un error, por ejemplo un apellido mal escrito o una fecha equivocada. La reemisión crea un documento nuevo con los datos corregidos y lo vincula al original, sin que el interesado tenga que volver a Mesa de Partes. Mantiene el número de expediente del original y sigue el flujo normal de revisión y firma (HU10–HU15): el Director puede firmarla, observarla o rechazarla. Cuando el Director la firma, una misma transacción del contrato registra el nuevo documento y anula el original (RF51).

Como en el prototipo, se reemite con el botón "Reemitir con corrección". Está en el detalle de un documento firmado y, en el detalle de un lote, en la fila de cada certificado firmado.

| Paso (como en el prototipo) | Qué ocurre |
|---|---|
| Formulario | Aparece precargado con los datos del original y el aviso "Reemisión de [código]. Cuando el Director firme el nuevo documento, el original se anulará automáticamente." Además pide el campo **Motivo de la reemisión** |
| Envío | Se crea un documento nuevo, Pendiente, con otro código. El original sigue Firmado y muestra "Reemisión en revisión" |
| Revisión | En Por revisar aparece la etiqueta "Reemisión". En la revisión se lee "Este documento reemplaza a [código]", con la lista de cambios y el motivo |
| Firma | En una sola transacción se registra el nuevo documento y se anula el original. El original queda Anulado, con el aviso "Reemplazado por [código nuevo]" |

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 23 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El formulario se precarga con los datos del original.
  - Un documento a solicitud de parte se reemite con los mismos campos y validaciones del registro (HU08). El número de expediente es el del original y no se cambia.
  - Un certificado de un lote se reemite como en HU15: solo cambian los nombres, los apellidos y el DNI. El certificado nuevo queda en el mismo lote. El DNI no se repite en otro certificado vigente del lote; el original no cuenta.
  - Debe cambiar al menos un dato: si no cambió nada, se avisa "Corrija al menos un dato del documento."
- [ ] El motivo de la reemisión es obligatorio, de hasta 500 caracteres.
- [ ] El director visualiza los cambios respecto al original.
  - En Por revisar, el documento lleva la etiqueta "Reemisión".
  - La revisión muestra "Este documento reemplaza a [código]", los cambios campo por campo ("Apellidos: Rojas Inga → Rojas Ingaruca") y el motivo.
  - En la relación de un lote, el certificado reemitido muestra "Reemisión de [código]" y sus cambios.
- [ ] Al firmarse, el original se anula en la misma transacción.
  - El contrato registra el documento nuevo, anula el original y guarda qué documento lo reemplaza.
  - Si el original no está registrado o ya está anulado, la transacción no se aplica.
- [ ] Solo se reemite un documento **Firmado** del área propia (permiso DOCUMENTO_REEMITIR). Mientras una reemisión siga en curso (Pendiente, Procesando firma u Observada), no se crea otra. Si el Director la rechaza, el original sigue Firmado y se puede volver a reemitir.
- [ ] Mientras la reemisión esté en curso, el Director no puede anular el original por separado (HU29). Recibe el aviso de que se anulará al firmar la reemisión.
- [ ] El servidor marca los dos cambios solo después de leer la transacción en la blockchain: la reemisión Firmada y el original Anulado.
  - El original guarda el motivo "Reemplazado por [código nuevo]. Motivo de la reemisión: [motivo]".
  - Si el navegador se cierra, la sincronización (HU18) aplica los dos cambios.
- [ ] Los historiales quedan vinculados:
  - el original registra REEMISION_SOLICITADA, con el código nuevo y el motivo;
  - la reemisión registra REGISTRADO como "Reemisión de [código]", con el motivo y los cambios;
  - al firmarse, el original registra ANULADO con "reemplazado por [código nuevo]".
- [ ] El Área encargada ve los dos documentos en Mis documentos. En el detalle del original se lee "Reemisión en revisión" y luego "Reemplazado por [código]"; en el de la reemisión, "Reemisión de [código]" y el motivo.
- [ ] Sin sesión se responde 401, y con otro rol u otra área, 403 (RF04, RF05).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| El portal público muestra "Reemplazado por [código]" | HU19–HU21 (Sprint 5). El contrato ya lo deja consultable con `reemplazadoPor(codigo)` |
| Avisos al área cuando se firma la reemisión | HU26–HU28 (Sprint 6) |
| Corregir los datos del evento de un lote (taller, fechas, lugar), que son comunes a todos sus certificados | No se reemite por certificado. Requiere una historia propia si el PO lo prioriza |

**Notas técnicas**

- Contrato:
  - `registrarReemisiones(string[] codigos, bytes32[] hashes, bytes32[] dniHmacs, string[] originales)`, con hasta 50 por transacción. Emite `DocumentoRegistrado`, `DocumentoAnulado` y `DocumentoReemplazado`.
  - `reemplazadoPor(string codigo)` devuelve el código del documento que lo reemplaza.
  - `registrarDocumentos` no cambia. Si en una selección hay reemisiones y documentos nuevos, se envían en operaciones separadas.
- Base de datos:
  - el documento guarda a cuál reemplaza y el motivo;
  - un índice único impide dos reemisiones en curso del mismo original;
  - el número de expediente es único entre los documentos que no son reemisiones.
- API:
  - `POST /api/documentos/{codigo}/reemision/vista-previa`;
  - `POST /api/documentos/{codigo}/reemision`, que recibe los datos del documento y `"motivo"`.
  - La revisión y la preparación de la firma indican de qué documento es reemisión y qué cambió.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF50, RF51 |
