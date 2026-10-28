# E7: Anulación y reemisión

**Objetivo:** Corregir documentos ya emitidos sin perder la trazabilidad del original.
**Requerimientos:** RF49–RF51 · **Sprint:** 4 · **Fuente:** Tabla 23 de la tesis.

---

## HU29: Anular un documento firmado

**Como** director, **quiero** anular un documento firmado indicando un motivo, **para** que deje de ser válido cuando no debió emitirse.

**Criterios de aceptación**
- [ ] Solo se anulan documentos firmados.
- [ ] El motivo es obligatorio.
- [ ] La anulación se confirma desde la billetera del director.
- [ ] El portal público muestra el documento como anulado.

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
