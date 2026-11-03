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

**Criterios de aceptación**
- [ ] El PDF incluye la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.
- [ ] El hash se calcula con SHA-256.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30, RF36 |

## HU17: Almacenar el PDF en IPFS

**Como** sistema, **quiero** almacenar el PDF final en la red IPFS privada, **para** conservar el original para su verificación y reimpresión.

**Criterios de aceptación**
- [ ] Se guarda el identificador (CID) del archivo.
- [ ] Si el almacenamiento falla, el documento sale de la operación, vuelve a Pendiente y se registra el error.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30 |

## HU18: Sincronizar los estados con la blockchain

**Como** sistema, **quiero** sincronizar el estado de los documentos con la blockchain, **para** que ninguna firma o anulación quede sin reflejarse.

**Criterios de aceptación**
- [ ] Se leen los eventos del smart contract y se reanuda desde el último bloque procesado.
- [ ] Los documentos detenidos en proceso de firma se corrigen.
- [ ] Un código ya registrado no se registra de nuevo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF32–RF35 |
