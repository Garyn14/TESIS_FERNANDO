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
| Registrar cada búsqueda en la auditoría | HU24 |

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
