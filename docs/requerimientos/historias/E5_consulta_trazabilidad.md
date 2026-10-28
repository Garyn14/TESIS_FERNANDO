# E5: Consulta y trazabilidad interna

**Objetivo:** Ubicar cualquier documento, conocer su historial y emitir duplicados sin reiniciar el trámite.
**Requerimientos:** RF42–RF45 · **Sprint:** 6 · **Fuente:** Tabla 21 de la tesis.

---

## HU22: Buscar documentos

**Como** personal de Mesa de Partes, **quiero** buscar documentos por nombre, DNI, código de verificación o número de expediente, **para** ubicarlos con rapidez.

**Criterios de aceptación**
- [ ] La búsqueda por nombre admite coincidencias parciales.
- [ ] Los lotes se despliegan en sus certificados.
- [ ] Si no hay resultados, se informa con un mensaje.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF42 |

## HU23: Ver el estado de un documento

**Como** personal de Mesa de Partes, **quiero** ver el estado y los datos de un documento, **para** informar al ciudadano sobre su trámite.

**Criterios de aceptación**
- [ ] Se muestra uno de los seis estados posibles junto con los datos básicos del documento.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 2 | 6 | RF43 |

## HU24: Consultar el historial y la auditoría

**Como** personal de Mesa de Partes, **quiero** consultar el historial y el detalle técnico de auditoría de un documento, **para** demostrar su trazabilidad.

**Criterios de aceptación**
- [ ] Cada evento muestra fecha, hora y responsable.
- [ ] El detalle técnico aparece plegado por defecto.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 5 | 6 | RF44 |

## HU25: Descargar o imprimir un documento

**Como** personal de Mesa de Partes, **quiero** descargar o imprimir un documento firmado, **para** entregarlo o emitir un duplicado sin reiniciar el trámite.

**Criterios de aceptación**
- [ ] No se requiere una nueva firma.
- [ ] Cada impresión queda registrada en el historial del documento.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF45 |
