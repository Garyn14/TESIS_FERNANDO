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

**Contexto**

Los documentos a solicitud de parte nacen de un pedido de la persona en Mesa de Partes, que le asigna un número de expediente (RF11). El Área encargada elige el tipo (HU07), completa el formulario, revisa la vista previa y lo envía al Director. Al enviarlo, la plataforma le asigna el código de verificación y el token del QR (RF16), y guarda el HMAC del DNI que más adelante se registra en la blockchain (RF17). Desde ese momento el documento queda Pendiente y no se puede modificar (RF20).

**Datos del formulario**

| Campo | Tipos | Regla |
|---|---|---|
| N.° de expediente | Todos | Obligatorio. **Formato provisional `EXP-AAAA-NNNNNN`** (ej.: EXP-2026-004817), tomado del prototipo hasta que el PO confirme el formato de Mesa de Partes. No se repite entre documentos |
| Nombres y Apellidos | Todos | Obligatorios, de 2 a 100 caracteres: letras (con tildes y ñ), espacios, apóstrofo o guion |
| DNI | Todos | Obligatorio, 8 dígitos (RF12) |
| Cultivo principal y Sector o comunidad | Constancia de Productor Activo | Obligatorios, de 2 a 100 caracteres |
| Modalidad (preprofesionales o profesionales), Área donde realizó las prácticas, Fecha de inicio y Fecha de fin | Certificado de Prácticas | Obligatorios. La fecha de fin no puede ser anterior a la de inicio ni posterior a hoy |
| Cargo, Fecha de inicio y Fecha de fin | Certificado de Trabajo | Obligatorios, con la misma regla de fechas |

El texto de cada documento se arma con estos datos, a partir de los textos del prototipo. Por ejemplo, el Certificado de Trabajo dice: "Por haber laborado en la Agencia Agraria Satipo como {cargo}, del {inicio} al {fin}, demostrando responsabilidad y buen desempeño". **Los campos y los textos están pendientes de validar con el PO**, con los ejemplos reales de cada documento que se le pidieron en la revisión del Sprint 1.

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 18 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se exige el número de expediente.
- [ ] Se validan los campos antes del envío.
- [ ] Se muestra una vista previa.
- [ ] Al enviar, se genera el código de verificación y el documento queda en estado Pendiente, sin posibilidad de edición.
- [ ] El formulario del tipo elegido muestra sus campos y los pasos "Datos de la solicitud · Vista previa". Cada campo con error se señala con su mensaje, y no se pasa a la vista previa mientras haya errores. El servidor vuelve a validar todo al generar la vista previa y al enviar, aunque se llame a la API directamente.
- [ ] Si el número de expediente ya está en otro documento, no se envía y se indica "El número de expediente ya está registrado en otro documento".
- [ ] La vista previa muestra el documento con la plantilla de su tipo: encabezado de la agencia, título (CERTIFICADO o CONSTANCIA), nombre del beneficiario, el texto con los datos y la firma del Director. Lleva la marca de agua "VISTA PREVIA" e indica que la fecha de emisión y el código QR se asignan al firmar (RF18). Junto a ella se ven el expediente y el DNI. Desde la vista previa se puede volver al formulario sin perder los datos.
- [ ] Enviar pide confirmación. Al confirmar, se muestra "Documento enviado a revisión" con su código de verificación.
- [ ] El código tiene el formato `DRA-AAAA-XXXXXX`: el año de envío y 6 caracteres en mayúsculas, sin 0, O, 1, I ni L para que no se confundan al leerlos (RNF04). Es único y se genera al azar. También se genera un token aleatorio único para el código QR, de 256 bits (RF16; RNF04 pide al menos 128).
- [ ] Se guarda el HMAC-SHA256 del DNI, calculado con una clave secreta que se configura fuera del código (RF17, RNF03). Si la clave no está configurada, no se registra ningún documento y se indica que falta configurarla.
- [ ] El documento guarda el tipo, el origen (a solicitud de parte), el área, quién lo registró y cuándo. El registro queda en su historial.
- [ ] La pantalla "Mis documentos" deja de mostrar el aviso del Sprint 2. Lista los documentos del área de la persona, del más reciente al más antiguo, con código, tipo, beneficiario, expediente, fecha de envío y estado. Así se completa la parte de documentos del segundo criterio de HU05: "solo ve los documentos de su área".
- [ ] El detalle de un documento Pendiente muestra sus datos y su vista previa, sin ninguna opción para editarlo. El servidor no tiene ninguna ruta para modificarlo (RF20).
- [ ] Un documento de otra área no se muestra, aunque se escriba su dirección o se llame a la API: se indica "Este documento no pertenece a su área" (RF05).
- [ ] Solo se puede registrar un tipo del área de la persona y que sea a solicitud de parte. Los de oficio se registran por lista (HU09).
- [ ] Registrar exige el permiso DOCUMENTO_REGISTRAR y ver Mis documentos, DOCUMENTO_VER_AREA (rol Área encargada). Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Emisión por lista y lotes | HU09 |
| Revisar, observar, rechazar y firmar | HU10 a HU12 (Sprint 3) |
| PDF definitivo con QR y hash, IPFS y registro en la blockchain | HU16 a HU18 (Sprint 3) |
| Corregir un documento observado | HU15 (Sprint 4) |
| Pestañas de filtro por estado en Mis documentos | Cuando existan los demás estados (Sprints 3 y 4) |
| Formato definitivo del número de expediente | Pendiente de confirmar con el PO; cambiarlo es una sola validación |

**Notas técnicas**

- API: GET /api/tipos-documento/{codigo} ahora incluye los campos del formulario. POST /api/documentos/vista-previa (valida y devuelve el texto) y POST /api/documentos (registra y envía). GET /api/documentos (Mis documentos) y GET /api/documentos/{codigo} (detalle). Todas pasan por AlcanceDeArea.
- Migración V10: tablas documento y documento_historial. El número de expediente, el código y el token del QR son únicos.
- La clave del HMAC se lee de la variable PLATAFORMA_CLAVE_HMAC_DNI (al menos 32 caracteres). En AWS irá en el gestor de secretos (DRA-44). En el entorno local la define levantar.sh.
- El DNI se guarda también en claro, porque se imprime en el documento y lo ve el Director al revisar. A la blockchain solo irá el HMAC (RNF03).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 2 | RF11, RF12, RF16–RF18, RF20 (relacionados: RF05, RF10) |


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
