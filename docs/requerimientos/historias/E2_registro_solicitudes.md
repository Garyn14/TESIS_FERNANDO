# E2: Registro de solicitudes de documentos

**Objetivo:** Generar los documentos a partir de plantillas, de forma individual o por lista.
**Requerimientos:** RF10–RF20 · **Sprint:** 2 · **Fuente:** Tabla 18 de la tesis.

---

## HU07: Seleccionar el tipo de documento

**Como** Área encargada, **quiero** seleccionar el tipo de documento a emitir, **para** acceder a su formulario.

**Criterios de aceptación**
- [ ] Solo se listan los tipos asignados al área.
- [ ] Los tipos de oficio abren el registro por lista.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 2 | 2 | RF10 |

## HU08: Registrar un documento a solicitud de parte

**Como** Área encargada, **quiero** completar y enviar el formulario de un documento a solicitud de parte, **para** dejarlo pendiente de revisión.

**Criterios de aceptación**
- [ ] Se exige el número de expediente.
- [ ] Se validan los campos antes del envío.
- [ ] Se muestra una vista previa.
- [ ] Al enviar, se genera el código de verificación y el documento queda en estado Pendiente, sin posibilidad de edición.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 2 | RF11, RF12, RF16–RF18, RF20 |

## HU09: Registrar una emisión por lista

**Como** Área encargada, **quiero** registrar una emisión por lista con los datos del evento y la relación de beneficiarios, **para** generar todos los certificados de oficio de una sola vez.

**Criterios de aceptación**
- [ ] La relación se carga de forma manual o desde la plantilla Excel.
- [ ] Cada fila se valida y sus errores se señalan.
- [ ] La vista previa muestra un certificado de ejemplo y la relación completa.
- [ ] Al enviar, se crea un documento por beneficiario, agrupados en un lote.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 2 | RF13–RF19 |
