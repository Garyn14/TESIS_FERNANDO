# E2: Registro de solicitudes de documentos

**Objetivo:** Generar los documentos a partir de plantillas, de forma individual o por lista.
**Requerimientos:** RF10–RF20 · **Sprint:** 2 · **Fuente:** Tabla 18 de la tesis.

---

## HU07: Seleccionar el tipo de documento

**Como** Área encargada, **quiero** seleccionar el tipo de documento a emitir, **para** acceder a su formulario.

**Contexto**

Es la puerta de entrada al registro de documentos (E2). Cada área emite ciertos tipos de documento (RF06, HU05). El origen de cada tipo define cómo se registra (RF11):

| Origen | Cómo se registra | Formulario | Tipos de documento |
|---|---|---|---|
| A solicitud de parte | Un documento por solicitud, con el número de expediente que asigna Mesa de Partes | HU08 | Constancia de Productor Activo, Certificado de Prácticas, Certificado de Trabajo |
| De oficio | Emisión por lista: los datos del evento se ingresan una vez, junto con la relación de beneficiarios. Se crea un documento por beneficiario, agrupados en un lote | HU09 | Certificado de Capacitación, Certificado de Reconocimiento |

Con esta historia, la opción "Nuevo documento" del menú deja de mostrar el aviso "Se habilita en el Sprint 2" y lleva a la selección del tipo. Los formularios se construyen en HU08 y HU09, en este mismo sprint.

**Criterios de aceptación**

Los dos primeros son los de la Tabla 18 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Solo se listan los tipos asignados al área.
- [ ] Los tipos de oficio abren el registro por lista.
- [ ] La pantalla "Nuevo documento" muestra una tarjeta por cada tipo activo asignado al área de la persona. Cada tarjeta tiene el nombre, una descripción breve y el origen ("A solicitud de parte" o "Emisión por lista"). Debajo, la nota "Solo se muestran los tipos de documento asignados a su área".
- [ ] Al elegir un tipo de oficio se abre el registro por lista de ese tipo, identificado con "Origen: De oficio" y los pasos Datos del evento · Beneficiarios · Vista previa (HU09). Al elegir un tipo a solicitud de parte se abre el registro individual, identificado con "Origen: A solicitud de parte" (HU08).
- [ ] Desde el formulario se puede volver a la selección del tipo.
- [ ] Si se escribe directamente la dirección del formulario de un tipo que no es del área, o que no existe o está inactivo, el formulario no se muestra y se indica "Este tipo de documento no está asignado a su área". La regla se aplica en el servidor, con el mismo componente de HU05 (RF05), aunque se llame a la API directamente.
- [ ] Si la cuenta no tiene área asignada, la pantalla no muestra tipos y avisa que debe comunicarse con el Administrador.
- [ ] Si el Administrador cambia el área de la persona con la sesión abierta, al volver a "Nuevo documento" ve los tipos de la nueva área (HU03, HU05).
- [ ] Solo las cuentas con el permiso DOCUMENTO_REGISTRAR (rol Área encargada) ven la opción y pueden consultar los tipos. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Formulario a solicitud de parte, número de expediente, vista previa y envío | HU08 |
| Formulario de emisión por lista, plantilla Excel y lote | HU09 |
| Pantalla "Mis documentos" | Sprint 2, cuando existan los documentos (HU08 y HU09) |
| Cambiar qué tipos emite cada área | Con una migración, como las áreas (HU05) |

**Notas técnicas**

- API: GET /api/tipos-documento (existe desde HU05; ahora incluye la descripción) y GET /api/tipos-documento/{codigo} (un tipo permitido, para abrir su formulario). Las dos exigen el permiso DOCUMENTO_REGISTRAR y pasan por AlcanceDeArea.
- Migración V9: columna descripcion en tipo_documento, con el texto de cada tipo. **Las descripciones están pendientes de validar con el PO**, como los nombres de las áreas.
- Rutas del frontend: #/nuevo-documento (selección) y #/nuevo-documento/{codigo} (formulario del tipo).
- A diferencia del prototipo, ningún tipo asignado aparece como "Disponible próximamente": cuando terminen HU08 y HU09, todos los tipos del área se podrán emitir.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 2 | 2 | RF10 (relacionados: RF05, RF06, RF11) |


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
