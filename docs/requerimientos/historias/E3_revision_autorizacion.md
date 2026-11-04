# E3: Revisión y autorización de emisión

**Objetivo:** Permitir que el director revise, observe, rechace y firme los documentos sin depender de su presencia en la sede.
**Requerimientos:** RF21–RF35 · **Sprints:** 3 y 4 · **Fuente:** Tabla 19 de la tesis.

---

## HU10: Ver los documentos pendientes de revisión

**Como** director, **quiero** ver los documentos pendientes de revisión, **para** atenderlos en orden.

**Contexto**

Es la bandeja del Director. Hoy recibe los documentos impresos de varias áreas y no tiene una vista que le diga qué está pendiente ni en qué orden atenderlo. Con esta historia ve, en la opción "Por revisar", todo lo que las áreas enviaron (HU08 y HU09). Los muestra del más antiguo al más reciente, y cada lote aparece como un solo elemento (RF21). Al abrir un documento o un lote, la plataforma registra que lo revisó (RF22). Ese registro es lo que la HU11 exige para dejar seleccionarlo y firmarlo.

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se ordenan del más antiguo al más reciente.
- [ ] Los lotes aparecen como un solo elemento.
- [ ] Se registra qué documentos fueron revisados.
- [ ] La opción "Por revisar" deja de mostrar el aviso "Se habilita en el Sprint 3". Lista los documentos Pendientes de todas las áreas, con el subtítulo "Documentos enviados por las áreas, del más antiguo al más reciente". Cada fila muestra el tipo, el beneficiario, el área, quién lo envió, la fecha de envío y la revisión. En los de solicitud de parte se muestra también el número de expediente.
- [ ] Un lote se muestra en una sola fila, con su número, el nombre del evento y la cantidad de certificados (por ejemplo, "Lote 2026-001 · Manejo integrado de plagas en café · 8 certificados").
- [ ] La columna Revisión dice "Sin revisar" o "✓ Revisado".
- [ ] Al abrir un documento se ven sus datos (con el expediente, si lo tiene) y su vista previa con la plantilla. Al abrirlo queda registrado como revisado, con quién y cuándo, y el evento queda en su historial.
- [ ] Al abrir un lote se ven los datos del evento y quién lo envió. A la izquierda está el certificado del beneficiario elegido, y se puede pasar con "‹ Anterior" y "Siguiente ›" ("Certificado 3 de 8"). A la derecha está la relación de beneficiarios con su DNI: al pulsar un nombre se muestra su certificado. Abrir el lote cuenta como revisión de todos sus documentos (RF22).
- [ ] Desde el detalle se vuelve a la bandeja con "← Volver a Por revisar", y el elemento aparece como Revisado.
- [ ] Sin pendientes se muestra "¡Todo al día! No tiene documentos pendientes de revisión".
- [ ] Solo un documento Pendiente se puede abrir para revisión. Uno inexistente o que ya no está Pendiente no se muestra.
- [ ] Solo las cuentas con el permiso DOCUMENTO_REVISAR (rol Director) ven la opción y pueden consultar la bandeja. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Seleccionar los revisados y firmarlos ("Firmar seleccionados") | HU11 |
| Firmar el lote completo | HU12 |
| Observar y rechazar (con su ventana de motivo) | HU13 y HU14 (Sprint 4) |
| Contador de pendientes en el menú y avisos de documentos nuevos | HU26–HU28 (Sprint 6, notificaciones) |
| Etiquetas "Corregido" y "Reemisión" | HU15 y HU30 (Sprint 4) |

**Notas técnicas**

- API: GET /api/revision (bandeja) y POST /api/revision/documentos/{codigo} y POST /api/revision/lotes/{numero} (abren para revisar y registran la revisión). Se usa POST porque registra un dato.
- Migración V12: columnas revisado_por y revisado_en en documento, y el evento REVISADO en documento_historial.
- El Director no está limitado por área (RF05 solo limita al Área encargada).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 3 | RF21, RF22 |


## HU11: Firmar uno o varios documentos

**Como** director, **quiero** firmar uno o varios documentos revisados en una sola operación, **para** aprobar su emisión sin estar en la sede.

**Criterios de aceptación**
- [ ] Solo se firman documentos revisados.
- [ ] Se verifica la billetera y la red antes de firmar.
- [ ] Una selección de más de 50 documentos se divide en varias transacciones.
- [ ] Un documento que falla vuelve a Pendiente sin detener al resto.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF23, RF28–RF31 |

## HU12: Revisar y firmar un lote

**Como** director, **quiero** revisar y firmar un lote como una unidad, **para** aprobar los certificados de un evento sin abrirlos uno por uno.

**Criterios de aceptación**
- [ ] Revisar el certificado de ejemplo y la relación cuenta como revisión de todo el lote.
- [ ] Se puede observar o rechazar beneficiarios individuales o el lote completo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 3 | RF22, RF27 |

## HU13: Observar un documento

**Como** director, **quiero** observar un documento indicando un motivo, **para** que el área lo corrija.

**Criterios de aceptación**
- [ ] El motivo es obligatorio.
- [ ] El documento vuelve al área encargada.
- [ ] La observación queda en el historial.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF25 |

## HU14: Rechazar un documento

**Como** director, **quiero** rechazar un documento indicando un motivo, **para** concluir un trámite que no debe emitirse.

**Criterios de aceptación**
- [ ] El motivo es obligatorio.
- [ ] El rechazo es definitivo.
- [ ] En los documentos a solicitud de parte se avisa a Mesa de Partes.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF26 |

## HU15: Corregir y reenviar un documento observado

**Como** Área encargada, **quiero** corregir un documento observado y reenviarlo, **para** continuar el trámite sin iniciar uno nuevo.

**Criterios de aceptación**
- [ ] Se muestra el motivo de la observación.
- [ ] Se aplican las mismas validaciones del registro.
- [ ] El documento vuelve a Pendiente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 4 | RF20, RF25 |

## HU16: Generar el PDF final y su hash

**Como** sistema, **quiero** generar el PDF final y calcular su hash al iniciarse la firma, **para** que lo registrado coincida con lo que se imprime.

**Contexto**

La vista previa (HU08, HU09) es solo una imagen en pantalla con la marca "VISTA PREVIA". Al firmar hace falta el documento definitivo: un PDF con la fecha de emisión, el código QR y el código de verificación (RF36). Su hash SHA-256 es lo que se registra en la blockchain (RF31), así que lo que se imprime y lo registrado son el mismo archivo (RF30). Esta historia construye la generación del PDF y el cálculo del hash. La firma que los usa llega con HU11, y el almacenamiento en IPFS, con HU17.

**Contenido del PDF**

| Elemento | Detalle |
|---|---|
| Formato | A4 horizontal, con el diseño de la vista previa del prototipo: encabezado y logo de la agencia, título (CERTIFICADO o CONSTANCIA), "Otorgado a", nombre del beneficiario y el texto del documento. Sin la marca de agua |
| Fecha de emisión | El día en que se inicia la firma, escrito con el mes en letras (por ejemplo, 4 de noviembre de 2026), en hora de Lima |
| Firma | Nombre del Director y "Director de la Agencia Agraria Satipo", con la nota "Firmado digitalmente mediante blockchain" |
| Código QR | Lleva la dirección de verificación del portal público con el token del documento (RF16). Debajo se imprime el código de verificación |
| Leyenda | "Verifique la autenticidad de este documento en {portal} con el código {código}" (RF36) |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El PDF incluye la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.
- [ ] El hash se calcula con SHA-256.
- [ ] El PDF reproduce los datos y el texto que el Área encargada envió y el Director revisó (HU08, HU09), sin la marca "VISTA PREVIA".
- [ ] El código QR se puede leer con un lector común, y lleva a la dirección de verificación del documento: la del portal con el token aleatorio del QR, nunca el DNI.
- [ ] El hash es el SHA-256 de los bytes exactos del archivo, en hexadecimal (64 caracteres), y es lo que se registrará en la blockchain (HU11).
- [ ] La dirección del portal se configura fuera del código (PLATAFORMA_PORTAL_URL). El portal se construye en el Sprint 5.
- [ ] El Director puede abrir una **muestra** del PDF final desde la revisión de un documento o de un lote, para ver cómo se imprimirá. La muestra lleva la marca "MUESTRA – SIN VALOR". No se guarda ni se registra.
- [ ] Solo el Director (permiso DOCUMENTO_REVISAR) puede abrir la muestra, y solo de un documento Pendiente. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Generar el PDF al firmar, guardar su hash y registrarlo en el contrato | HU11 (usa lo construido aquí) |
| Guardar el PDF en IPFS y su CID | HU17 |
| Portal de verificación al que apunta el QR | HU19–HU21 (Sprint 5) |
| Descargar e imprimir el documento firmado | HU25 (Sprint 6) |

**Notas técnicas**

- El PDF se genera en el servidor con OpenPDF y el QR con ZXing, dos bibliotecas libres. El logo va dentro del backend.
- La fecha oficial de emisión es la del bloque (RF32). La fecha impresa es la del día en que se inicia la firma: las dos coinciden en el día, porque el bloque se confirma segundos después de la firma.
- API: GET /api/revision/documentos/{codigo}/pdf (la muestra), solo para el Director.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30, RF36 (relacionados: RF31, RF32) |


## HU17: Almacenar el PDF en IPFS

**Como** sistema, **quiero** almacenar el PDF final en la red IPFS privada, **para** conservar el original para su verificación y reimpresión.

**Contexto**

El PDF final y su hash se generan con HU16. El nodo IPFS privado ya existe (DRA-46): solo habla con nodos que tienen su clave de enjambre, para que los PDF, que tienen datos personales, no circulen por la red pública de IPFS (RNF03). Al firmar (HU11), antes de que el Director registre los hashes con su billetera, el sistema **prepara** cada documento. Esta historia construye esa preparación, y HU11 la usa:

| Paso | Qué ocurre |
|---|---|
| 1 | El documento pasa a **Procesando firma**, un estado que se guarda (lo necesita HU18 para corregir los que se detengan) |
| 2 | Se genera el PDF final con la fecha de emisión de ese día y se calcula su SHA-256 (HU16) |
| 3 | El PDF se guarda en IPFS y queda fijado, para que no se borre |
| 4 | Se guardan el CID, el hash y la fecha de emisión impresa. El documento sigue en Procesando firma hasta que HU11 registre la firma |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se guarda el identificador (CID) del archivo.
- [ ] Si el almacenamiento falla, el documento sale de la operación, vuelve a Pendiente y se registra el error.
- [ ] El archivo guardado en IPFS es exactamente el del hash: al recuperarlo por su CID, su SHA-256 es el guardado.
- [ ] El PDF queda fijado (pin) en el nodo y su CID es de la versión 1 (`bafy…`).
- [ ] Solo se preparan documentos Pendientes que el Director ya revisó (RF22, RF23). Los demás se informan como no preparados, con su motivo, sin detener al resto.
- [ ] Si falla un documento, los demás de la operación siguen. El error queda en el historial del documento y en el registro del servidor.
- [ ] Un documento no se prepara dos veces a la vez: si ya está en Procesando firma, se informa como no preparado.
- [ ] El documento en Procesando firma sale de la bandeja Por revisar, y el Área encargada lo ve con ese estado en Mis documentos.
- [ ] Solo el Director (permiso DOCUMENTO_FIRMAR) puede preparar documentos. Sin sesión se responde 401 y con otro rol, 403 (RF04).
- [ ] La dirección de la API de IPFS se configura fuera del código (PLATAFORMA_IPFS_URL). La API solo escucha en el servidor (127.0.0.1).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Pantalla de firma, registro de los hashes en el contrato y paso a Firmado | HU11 y HU12 (usan esta preparación) |
| Corregir los documentos detenidos en Procesando firma | HU18 |
| Recuperar el PDF de IPFS para verificarlo o reimprimirlo | HU21 y HU25 |
| Réplica del nodo IPFS en AWS | DRA-44 |

**Notas técnicas**

- API: `POST /api/firma/preparacion` con `{"codigos": [...]}`, hasta 300 por operación (un lote completo). Responde los preparados (código, hash, CID) y los no preparados (código, motivo). HU11 usa los hashes para la transacción de la billetera.
- Cada documento se prepara en su propia transacción, para que un fallo no deshaga los demás.
- El backend usa la API HTTP de Kubo (`add` con `pin=true` y `cid-version=1`).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30 (relacionados: RF23, RNF03) |

## HU18: Sincronizar los estados con la blockchain

**Como** sistema, **quiero** sincronizar el estado de los documentos con la blockchain, **para** que ninguna firma o anulación quede sin reflejarse.

**Criterios de aceptación**
- [ ] Se leen los eventos del smart contract y se reanuda desde el último bloque procesado.
- [ ] Los documentos detenidos en proceso de firma se corrigen.
- [ ] Un código ya registrado no se registra de nuevo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF32–RF35 |
