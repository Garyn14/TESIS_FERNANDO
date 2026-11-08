# E5: Consulta y trazabilidad interna

**Objetivo:** Ubicar cualquier documento, conocer su historial y emitir duplicados sin reiniciar el trámite.
**Requerimientos:** RF42–RF45 · **Sprint:** 6 · **Fuente:** Tabla 21 de la tesis.

---

## HU22: Buscar documentos

**Como** personal de Mesa de Partes, **quiero** buscar documentos por nombre, DNI, código de verificación o número de expediente, **para** ubicarlos con rapidez.

**Contexto**

Mesa de Partes atiende al ciudadano que pregunta por su trámite y entrega los documentos firmados. Hasta ahora cada rol solo veía su propia bandeja: el Área encargada, Mis documentos; el Director, Por revisar y Documentos firmados. Esta historia construye la pantalla **Buscar documentos** del rol Consulta interna (permiso `DOCUMENTO_BUSCAR`). La pantalla busca en **todos los documentos de todas las áreas y en cualquier estado**, porque el ciudadano también pregunta por los que siguen en trámite.

| Paso | Qué hace la persona |
|---|---|
| 1 | Abre Buscar documentos. Ve los documentos más recientes |
| 2 | Escribe un nombre, un DNI, un código, un número de expediente o un número de lote. Los resultados se actualizan mientras escribe |
| 3 | Si lo necesita, filtra por estado: Todos, En trámite, Firmados, Anulados o Rechazados |
| 4 | Ubica el documento. Los certificados de un lote aparecen dentro de la fila de su lote |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La búsqueda por nombre admite coincidencias parciales.
  - Basta con parte del nombre o del apellido: "quisp" encuentra a "Rosa Quispe Huamán".
  - Si se escriben varias palabras, deben aparecer todas, en cualquier orden: "rosa huaman" encuentra a "Rosa Quispe Huamán".
  - No distingue mayúsculas, minúsculas ni tildes: "huaman" encuentra "Huamán".
- [ ] Los lotes se despliegan en sus certificados.
  - Un lote ocupa una fila ("Lote 2026-001", con el tipo, el área y la cantidad de certificados) y se despliega con un botón para ver sus certificados.
  - Si la búsqueda coincide con el número del lote, aparece el lote con todos sus certificados, plegado.
  - Si coincide con algunos certificados del lote (por ejemplo, un DNI), aparece el lote **ya desplegado** y solo con esos certificados, con la nota "2 de 25 certificados coinciden con la búsqueda".
- [ ] Si no hay resultados, se informa con un mensaje: "No se encontraron documentos con «texto». Revise lo que escribió o busque por otro dato."
- [ ] Se busca a la vez por todos los datos:
  - **nombre** del beneficiario, con coincidencias parciales;
  - **DNI**, completo o parcial;
  - **código de verificación**, completo o parcial y sin importar las mayúsculas: "f8r2ma" encuentra `DRA-2026-F8R2MA`;
  - **número de expediente**, completo o parcial;
  - **número de lote**: "2026-001".
- [ ] Cada resultado muestra el código, el tipo, el beneficiario, el DNI, el número de expediente, el área, la fecha de envío y el estado, con los mismos colores de Mis documentos.
- [ ] Sin texto, la pantalla muestra los documentos más recientes.
- [ ] Los filtros por estado son Todos, **En trámite** (Pendiente, Procesando firma y Observado), Firmados, Anulados y Rechazados. Se combinan con el texto.
- [ ] Se muestran **hasta 50 filas**, de la más reciente a la más antigua. Si hay más, se avisa: "Se muestran los 50 resultados más recientes. Escriba más datos para precisar la búsqueda."
- [ ] El texto se busca desde **2 caracteres**. Con 1 carácter se indica "Escriba al menos 2 caracteres." y no se consulta al servidor.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_BUSCAR`) puede buscar. Sin sesión se responde 401 y con otro rol, 403 (RF04). La opción del menú deja de mostrar el aviso "Se habilita en el Sprint 6".

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Abrir un resultado para ver su estado y sus datos | HU23 |
| Historial y detalle técnico de auditoría | HU24 |
| Descargar, imprimir y el filtro "Listos para entregar" del prototipo, que depende de lo impreso | HU25 |
| Registrar cada búsqueda en la auditoría | Pregunta abierta al PO (ver HU24) |

**Notas técnicas**

- API: `GET /api/consulta/documentos?texto=…&estado=TODOS|EN_TRAMITE|FIRMADOS|ANULADOS|RECHAZADOS`. Responde `{ filas, hayMas }`. Una fila es un documento o un lote con sus certificados coincidentes, la cantidad total del lote y si se muestran todos.
- La búsqueda se hace en PostgreSQL con una consulta parametrizada. Las tildes se quitan con `translate` y las mayúsculas con `lower`, en la columna y en el texto. Cada palabra del nombre es una condición aparte.
- El servidor vuelve a validar el texto: con menos de 2 caracteres (sin contar espacios) responde 400.
- En el frontend, la búsqueda espera 300 ms después de la última tecla para no consultar en cada una.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF42 |

## HU23: Ver el estado de un documento

**Como** personal de Mesa de Partes, **quiero** ver el estado y los datos de un documento, **para** informar al ciudadano sobre su trámite.

**Contexto**

Con HU22, Mesa de Partes ubica el documento en Buscar documentos. Esta historia agrega su **ficha**: al pulsar el código de un resultado se abre una página con el estado y los datos básicos del documento. El estado viene acompañado de una explicación en lenguaje claro, para que Mesa de Partes sepa qué decirle al ciudadano.

| Paso | Qué hace la persona |
|---|---|
| 1 | Busca el documento (HU22) y pulsa su código, también dentro de un lote |
| 2 | Ve el estado, lo que significa y sus fechas, y los datos del documento |
| 3 | Vuelve a Buscar documentos con la misma búsqueda y el mismo filtro |

**Criterios de aceptación**

El primero es el de la Tabla 21 de la tesis. Los demás detallan cómo se cumple.

- [ ] Se muestra uno de los seis estados posibles junto con los datos básicos del documento.
- [ ] El estado se muestra con su color (los de Mis documentos) y con una explicación para el ciudadano:

  | Estado | Explicación | Fechas y datos |
  |---|---|---|
  | Pendiente | "Está en revisión del Director. Todavía no se puede entregar." | Fecha de envío |
  | Procesando firma | "El Director está firmando el documento. Estará listo en unos minutos." | Fecha de envío |
  | Observado | "El Director pidió corregir el documento. El {área} lo corregirá y lo volverá a enviar." | Motivo de la observación |
  | Rechazado | "El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite." | Motivo del rechazo |
  | Firmado | "Firmado y registrado en la blockchain. Se puede entregar al ciudadano." | Fecha y hora de la firma |
  | Anulado | "Fue anulado y ya no es válido." | Fecha de la anulación y motivo |
- [ ] Los datos básicos son: código de verificación, tipo, beneficiario, DNI, origen (a solicitud de parte o de oficio), N.° de expediente, área, fecha de envío y, en un certificado de lote, el número de lote y el nombre del evento.
- [ ] Reemisiones (HU30):
  - en un anulado que fue reemplazado: "Fue reemplazado por el documento {código}", con un enlace a su ficha;
  - en un documento con una reemisión en revisión: "Tiene una reemisión en revisión: {código}", con un enlace;
  - en una reemisión: "Reemplaza al documento {código}", con un enlace.
- [ ] En Buscar documentos, el código de cada resultado (también dentro de un lote) es un enlace a su ficha (`#/buscar/{código}`). El enlace "← Volver a Buscar documentos" regresa con el mismo texto y el mismo filtro.
- [ ] Un código que no existe muestra "No se encontró el documento {código}." y el enlace para volver.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_BUSCAR`) ve la ficha. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Historial de eventos y detalle técnico de auditoría (hash, CID, transacción) | HU24 |
| Ver, descargar e imprimir el documento, y el estado de entrega | HU25 |
| Avisar a Mesa de Partes cuando un documento se firma | HU28 |

**Notas técnicas**

- API: `GET /api/consulta/documentos/{codigo}`. No incluye el HMAC del DNI, el token del QR, el CID ni la transacción (HU24 los muestra en el detalle técnico).
- Un código inexistente responde 404 con el mensaje.
- La búsqueda de HU22 guarda su texto y su filtro en la dirección (`#/buscar?texto=…&estado=…`) para volver a ella desde la ficha.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 2 | 6 | RF43 |

## HU24: Consultar el historial y la auditoría

**Como** personal de Mesa de Partes, **quiero** consultar el historial y el detalle técnico de auditoría de un documento, **para** demostrar su trazabilidad.

**Contexto**

Cada paso del trámite ya queda en el historial del documento (`documento_historial`): el registro, la revisión, la firma, las observaciones, los rechazos, las correcciones, las anulaciones y las reemisiones. Ese historial no se modifica ni se elimina. La firma y la anulación también están en la blockchain (HU11, HU29), y el PDF final, en el IPFS privado (HU17). Esta historia los muestra en la ficha del documento (HU23), en dos secciones:

| Sección | Qué muestra | Para qué |
|---|---|---|
| **Historial** | Cada evento con su fecha, hora y responsable, del más antiguo al más reciente | Explicar qué pasó con el trámite |
| **Detalle técnico de auditoría** (plegado) | El hash del PDF, el CID en IPFS, la transacción y el bloque de la firma, la billetera firmante, la transacción y el bloque de la anulación y el contrato | Demostrar que el documento es el registrado en la blockchain |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Cada evento muestra fecha, hora y responsable.
  - La fecha y la hora van en hora de Lima: 07/11/2026 21:35.
  - El responsable es el nombre de la persona y su rol: "Rosa Quispe Huamán (Área encargada)".
  - Si el evento lo registró el sistema (la sincronización con la blockchain, HU18), el responsable es "Sistema (sincronización con la blockchain)".
  - Cada evento tiene un título claro (por ejemplo, "Registrado y enviado a revisión", "Firmado y registrado en la blockchain") y su detalle tal como se guardó: motivos, cambios, transacción.
  - Los eventos que requieren atención se distinguen por su color: rechazo y anulación en rojo; observación, firma no completada y error de almacenamiento en naranja.
- [ ] El detalle técnico aparece plegado por defecto.
  - El botón "Detalle técnico de auditoría" lo despliega y lo vuelve a plegar.
  - Muestra, cuando existen:
    - huella digital del PDF (SHA-256);
    - identificador en IPFS (CID);
    - transacción y bloque de la firma;
    - billetera firmante;
    - fecha y hora del registro en la blockchain;
    - transacción y bloque de la anulación;
    - dirección del contrato RegistroDocumentos.
  - Cada valor tiene un botón "Copiar".
  - Un documento que todavía no se firmó dice "Todavía no tiene registro en la blockchain."
- [ ] El historial y el detalle técnico se ven en la ficha del documento (HU23), debajo de los datos.
- [ ] Solo quien tiene el permiso `AUDITORIA_VER` (Consulta interna) los consulta. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Ver el PDF y comprobar su hash desde la pantalla | HU25 (descargar o imprimir) y el portal público (HU19–HU21) |
| Registrar las impresiones y los duplicados en el historial | HU25 |
| Registrar quién busca o consulta cada documento | Pregunta abierta al PO: hoy no se registra |

**Notas técnicas**

- API: `GET /api/consulta/documentos/{codigo}/auditoria`, con el permiso `AUDITORIA_VER`. Responde `{ eventos, tecnico }`.
- Los eventos se leen de `documento_historial`, con el nombre y el rol de quien los registró (un `LEFT JOIN`, porque el sistema no tiene cuenta).
- El HMAC del DNI y el token del QR no se muestran.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 5 | 6 | RF44 |

## HU25: Descargar o imprimir un documento

**Como** personal de Mesa de Partes, **quiero** descargar o imprimir un documento firmado, **para** entregarlo o emitir un duplicado sin reiniciar el trámite.

**Contexto**

El PDF final de cada documento firmado está en el IPFS privado (HU17), y su hash, en la blockchain (HU11). Mesa de Partes lo entrega al ciudadano impreso o en PDF. Si el ciudadano lo pierde, se imprime un **duplicado**: es el mismo PDF, con el mismo código y el mismo QR, así que no se vuelve a firmar ni a registrar.

Antes de entregarlo, el servidor hace la misma comprobación que el portal público (HU21). Recupera el PDF de IPFS, recalcula su hash y lo compara con el registrado en el contrato. Solo entrega un documento **Válido**. Así, Mesa de Partes nunca imprime un documento alterado o anulado.

| Paso | Qué hace la persona |
|---|---|
| 1 | Busca el documento (HU22) y abre su ficha (HU23). Ve si está "Listo para entregar" o cuántas veces se entregó |
| 2 | Pulsa **Ver documento**, **Descargar PDF** o **Imprimir** |
| 3 | El historial (HU24) registra la descarga o la impresión. Desde la segunda impresión, como duplicado |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] No se requiere una nueva firma.
  - Se entrega el PDF final guardado en IPFS, el mismo que se firmó: sin transacciones nuevas ni billetera.
  - Antes de entregarlo, el servidor comprueba que su hash es el registrado en el contrato y que no está anulado.
- [ ] Cada impresión queda registrada en el historial del documento.
  - La primera: "Impreso por {nombre} (Consulta interna)".
  - Las siguientes: "Duplicado impreso por {nombre} (Consulta interna). Impresión n.° {n}".
  - Cada descarga del PDF también se registra: "PDF descargado por {nombre} (Consulta interna)".
  - "Ver documento" solo muestra el PDF y no se registra.
- [ ] La ficha de un documento firmado tiene los botones **Ver documento**, **Descargar PDF** e **Imprimir**.
  - Muestra su estado de entrega: "Listo para entregar" si nunca se imprimió ni descargó; si no, "Entregado: impreso {n} veces, descargado {m} veces".
  - "Imprimir" abre el diálogo de impresión del navegador con el PDF.
  - "Descargar PDF" guarda el archivo con el código como nombre: `DRA-2026-F8R2MA.pdf`.
- [ ] Un documento que no está firmado (pendiente, observado, rechazado o anulado) no tiene esos botones. La API responde 409:
  - "Solo se entrega un documento firmado.";
  - si está anulado: "El documento está anulado: no se puede entregar.".
- [ ] Si el PDF no coincide con el registrado en la blockchain, no se entrega: 409 "El documento no coincide con su registro en la blockchain. No se puede entregar. Comuníquese con el Administrador." No se registra la entrega.
- [ ] Si IPFS o la blockchain no responden, se informa: 503 "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos."
- [ ] En Buscar documentos (HU22) se agrega el filtro **Listos para entregar**: firmados que nunca se imprimieron ni descargaron.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_IMPRIMIR`) puede ver, descargar o imprimir. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Imprimir todo un lote de una vez ("Imprimir lote" del prototipo) | Pregunta abierta al PO: hoy se imprime certificado por certificado |
| Aviso a Mesa de Partes cuando hay documentos listos para entregar | HU28 |
| Indicadores "Impresos esta semana" y "Duplicados emitidos" del prototipo | Pregunta abierta al PO |

**Notas técnicas**

- API:
  - `GET /api/consulta/documentos/{codigo}/pdf`: ver el documento (inline, sin registrar);
  - `POST /api/consulta/documentos/{codigo}/entregas` con `{"forma": "IMPRESION" | "DESCARGA"}`: registra el evento y responde el PDF.
  - Ninguno se guarda en caché (`no-store`).
- Migración V21: los eventos `IMPRESO` y `DESCARGADO` en el historial.
- La comprobación reutiliza la del portal (`VerificacionDeAutenticidad`).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF45 |
