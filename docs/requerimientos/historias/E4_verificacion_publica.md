# E4: Verificación pública de autenticidad

**Objetivo:** Permitir que cualquier tercero compruebe la autenticidad de un documento en segundos.
**Requerimientos:** RF36–RF41 · **Sprint:** 5 · **Fuente:** Tabla 20 de la tesis.

---

## HU19: Verificar mediante el código QR

**Como** entidad externa, **quiero** escanear el código QR de un documento, **para** comprobar su autenticidad y ver el documento completo.

**Criterios de aceptación**
- [ ] No se requiere registro.
- [ ] El resultado se muestra en menos de dos segundos.
- [ ] Si el documento es válido, se muestra completo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 5 | RF37, RF39 |

## HU20: Verificar mediante el código de verificación

**Como** entidad externa, **quiero** ingresar el código de verificación de un documento, **para** comprobar su autenticidad cuando no puedo escanear el código QR.

**Criterios de aceptación**
- [ ] Se valida el formato del código.
- [ ] Se muestran solo el tipo de documento, el nombre del titular, la fecha de emisión y el estado.
- [ ] Se limita el número de consultas por dirección IP.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 5 | RF37, RF40 |

## HU21: Comprobar la autenticidad del documento

**Como** sistema, **quiero** comprobar la autenticidad comparando el documento almacenado con su registro en la blockchain, **para** entregar un resultado confiable.

**Contexto**

Cada documento firmado está registrado en el contrato `RegistroDocumentos` (HU11): ahí están el hash SHA-256 de su PDF, el HMAC del DNI del beneficiario y la fecha del bloque. El PDF está guardado en el IPFS privado (HU17). Si se anuló, también lo dice el contrato (HU29), y si se reemplazó, el contrato sabe por cuál (HU30).

Esta historia construye la comprobación que usará el portal público. Con el QR (HU19) y con el código de verificación (HU20), el portal le pide el resultado al servidor, y el servidor lo decide así:

| Paso | Qué se comprueba | Si falla |
|---|---|---|
| 1 | El token del QR corresponde a un documento firmado o anulado de la plataforma | No válido |
| 2 | El contrato tiene registrado ese código (consulta de solo lectura) | No válido |
| 3 | El PDF guardado en IPFS se descarga y se recalcula su SHA-256. Debe ser igual al hash registrado en el contrato | No válido |
| 4 | El HMAC del DNI guardado en la plataforma es igual al registrado en el contrato | No válido |
| 5 | El contrato dice si el documento está anulado y, si lo está, si tiene una versión corregida | Anulado |

Si todo coincide y no está anulado, el resultado es **Válido**. La blockchain es la fuente de verdad (RNF10): si el contrato y la base no coinciden, manda el contrato.

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La consulta al smart contract es de solo lectura.
  - Usa `consultar`, `anulacion` y `reemplazadoPor`.
  - Ninguna verificación envía transacciones ni necesita billetera.
- [ ] Se recalcula el hash del PDF y se compara con el registrado.
  - Se calcula el SHA-256 de los bytes del PDF recuperado de IPFS por su CID y se compara con el hash del contrato.
  - Además se compara el HMAC del DNI.
- [ ] El resultado es **Válido**, **Anulado** o **No válido**.
- [ ] En un documento anulado se informa la fecha y si existe una versión corregida.
  - La fecha es la del bloque de la anulación.
  - La versión corregida se informa **sin revelar su código** (RF41): "Existe una versión corregida de este documento."
- [ ] Un resultado Válido o Anulado entrega lo que el portal muestra:
  - el tipo de documento y el nombre del titular;
  - la fecha de emisión, que es la del bloque del registro (RF32);
  - el estado.
  
  Nunca entrega el DNI, el HMAC, el CID ni datos internos.
- [ ] Un resultado No válido no entrega ningún dato del documento, solo "No encontramos un documento válido con estos datos." El motivo exacto (no registrado, hash distinto, HMAC distinto) queda en el registro del servidor, para el equipo.
- [ ] Si la blockchain o IPFS no responden, el resultado no es "No válido". Se informa "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos." (503).
- [ ] La comprobación responde en menos de dos segundos (RNF01).
- [ ] La API es pública, sin sesión: `GET /api/verificacion/{token}`. Un token con formato inválido responde No válido sin consultar la blockchain.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| El portal público, la ruta del QR y el documento completo | HU19 |
| Verificar con el código de verificación, y el límite de 10 consultas por minuto por IP (RNF04) | HU20 |
| Registrar cada consulta para la auditoría | HU24 (Sprint 6) |

**Notas técnicas**

- Nuevo servicio `VerificacionDeAutenticidad`, que usan HU19 y HU20.
- `ContratoRegistro` gana tres lecturas: el registro de un código, la fecha de su anulación y el código que lo reemplaza.
- El PDF se recupera con `AlmacenDeArchivos.recuperar(cid)` (HU17).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 5 | RF38, RF41 |
