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

**Criterios de aceptación**
- [ ] El formulario se precarga con los datos del original.
- [ ] El motivo de la reemisión es obligatorio.
- [ ] El director visualiza los cambios respecto al original.
- [ ] Al firmarse, el original se anula en la misma transacción.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF50, RF51 |
