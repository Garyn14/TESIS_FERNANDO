# E3: Revisión y autorización de emisión

**Objetivo:** Permitir que el director revise, observe, rechace y firme los documentos sin depender de su presencia en la sede.
**Requerimientos:** RF21–RF35 · **Sprints:** 3 y 4 · **Fuente:** Tabla 19 de la tesis.

---

## HU10: Ver los documentos pendientes de revisión

**Como** director, **quiero** ver los documentos pendientes de revisión, **para** atenderlos en orden.

**Criterios de aceptación**
- [ ] Se ordenan del más antiguo al más reciente.
- [ ] Los lotes aparecen como un solo elemento.
- [ ] Se registra qué documentos fueron revisados.

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
