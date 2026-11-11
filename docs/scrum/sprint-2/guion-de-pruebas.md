# Guion de pruebas del Sprint 2 para el PO

Este guion le permite al Product Owner probar las tres historias del Sprint 2 desde la pantalla y decidir si las aprueba. Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU07: Seleccionar el tipo de documento | DRA-18 | 2 |
| HU08: Registrar un documento a solicitud de parte | DRA-19 | 8 |
| HU09: Registrar una emisión por lista | DRA-20 | 13 |

## Antes de empezar

El equipo de desarrollo deja la plataforma lista, sin datos, y le entrega:

- la dirección de la plataforma (por ejemplo, <http://localhost:5173>);
- el usuario `admin` con su contraseña temporal;
- el archivo Excel de prueba `beneficiarios-prototipo.xlsx`, con los 8 participantes del taller del prototipo. Está en `plataforma/e2e/datos/` y solo se usa en HU09.

Recomendaciones:

- **Siga las historias en el orden de este guion.** Primero se crean las cuentas, con lo construido en el Sprint 1.
- **Algunas pruebas necesitan dos personas conectadas a la vez.** Use una ventana normal para el Administrador y una ventana de incógnito (o de otro navegador) para la otra persona.
- **Anote el número del paso** si algo no se ve como se espera. Eso es lo que se escribe en el ticket.
- **Haga el guion completo en una sola sesión.** Cada vez que la plataforma se vuelve a levantar empieza vacía.

Contraseñas que se usan en el guion (puede usar otras, siempre que tengan de 8 a 20 caracteres):

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| rquispe | Rosa Quispe Huamán | Emisor de área – Área de Capacitación | Demo2026 | Propia2026 |
| pmorales | Pedro Morales Ccanto | Emisor de área – Área de Administración | Demo2026 | Propia2026 |
| msalazar | Marco Salazar Vela | Emisor de área – Área de Desarrollo Agrario | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |

---

## 0. Preparación: cuentas de prueba

**Objetivo:** crear las cuentas que usan las tres historias. Esto se aprobó en el Sprint 1, así que aquí no se evalúa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Ingrese con `admin` y la contraseña temporal. Cámbiela por `AdminPropia26`. | Entra con el menú del Administrador. |
| 0.2 | En **Usuarios**, cree las cuatro cuentas de la tabla de arriba con "Nueva cuenta". Cada una lleva su nombre completo, su rol, su área y la contraseña temporal `Demo2026`. | Las cuatro cuentas aparecen en la lista, activas. |

El Director `cmendoza` no hace nada en este Sprint. Su nombre completo, "Ing. Carlos Mendoza Rivera", aparece bajo la línea de firma de las vistas previas. El espacio sobre la línea queda en blanco: la firma digital con la billetera llega en el Sprint 3.

---

## 1. HU07: Seleccionar el tipo de documento (DRA-18)

**Objetivo:** comprobar que el Emisor de área ve solo los tipos de documento de su área, cada uno con su origen. Los de oficio abren el registro por lista y los de solicitud de parte, el registro individual.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | En la ventana de incógnito, ingrese con `rquispe` / `Demo2026` y cambie la temporal por `Propia2026`. Abra **Nuevo documento**. | Aparece "Seleccione el tipo de documento que desea emitir" con dos tarjetas: Certificado de Capacitación y Certificado de Reconocimiento. Cada una tiene su descripción y la etiqueta "Emisión por lista". Debajo: "Solo se muestran los tipos de documento asignados a su área". |
| 1.2 | Pulse la tarjeta **Certificado de Capacitación**. | Se abre "Emisión por lista: Certificado de Capacitación", con "Origen: De oficio" y los pasos Datos del evento · Beneficiarios · Vista previa. |
| 1.3 | Pulse "← Cambiar tipo de documento". | Vuelve a la selección del tipo. |
| 1.4 | Escriba en la barra de direcciones la dirección de la plataforma seguida de `#/nuevo-documento/CONSTANCIA_PRODUCTOR_ACTIVO`. Es un tipo de otra área. | No se abre el formulario. Se indica "Este tipo de documento no está asignado a su área". |
| 1.5 | Cierre sesión. Ingrese con `pmorales` / `Demo2026`, cambie la temporal por `Propia2026` y abra **Nuevo documento**. | Ve sus dos tipos, Certificado de Prácticas y Certificado de Trabajo, con la etiqueta "A solicitud de parte". |
| 1.6 | Pulse **Certificado de Trabajo**. | Se abre el registro individual, con "Origen: A solicitud de parte" y los pasos Datos de la solicitud · Vista previa. Su formulario se prueba en HU08. |
| 1.7 | Sin cerrar la sesión de Pedro, en la ventana del Administrador edite `pmorales` y cambie su área a **Área de Desarrollo Agrario**. Luego, en la ventana de Pedro, pulse **Nuevo documento**. | Pedro ahora ve solo la Constancia de Productor Activo. Antes de seguir, devuélvale el área **Área de Administración** desde la ventana del Administrador. |
| 1.8 | Ingrese con `cmendoza` / `Demo2026` y cambie la temporal por `Propia2026`. | Su menú no tiene "Nuevo documento" ni "Mis documentos". |

**Para validar con el PO:** las descripciones de las tarjetas son una propuesta del equipo.

| Tipo | Descripción propuesta |
|---|---|
| Constancia de Productor Activo | Para productores agrarios que la solicitan en Mesa de Partes. |
| Certificado de Prácticas | Para estudiantes que culminaron sus prácticas en la agencia. |
| Certificado de Trabajo | Para personas que trabajaron en la agencia. |
| Certificado de Reconocimiento | Para reconocimientos institucionales. |
| Certificado de Capacitación | Para participantes de talleres y capacitaciones. |

---

## 2. HU08: Registrar un documento a solicitud de parte (DRA-19)

**Objetivo:** comprobar el registro de un documento a solicitud de parte, de principio a fin:

- se exige el número de expediente;
- los datos se validan antes del envío;
- se muestra una vista previa;
- al enviar, el documento queda Pendiente con su código de verificación y ya no se puede modificar.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como `pmorales`, abra **Nuevo documento** → **Certificado de Trabajo**. Sin completar nada, pulse "Continuar a vista previa". | No avanza. Cada campo vacío se marca con su mensaje, por ejemplo "Ingrese el número de expediente" e "Ingrese los nombres". |
| 2.2 | Escriba `4582936` en DNI (7 dígitos) y `2026-5391` en N.° de expediente. Ponga una fecha de fin anterior a la de inicio. Pulse "Continuar a vista previa". | "El DNI debe tener 8 dígitos". "Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817". "La fecha de fin no puede ser anterior a la de inicio". |
| 2.3 | Complete los datos correctos:<ul><li>expediente `EXP-2026-005391`;</li><li>DNI `45829364`;</li><li>nombres `Lucía`;</li><li>apellidos `Paredes Quinto`;</li><li>cargo `asistente administrativa`;</li><li>inicio 02/01/2025 y fin 30/09/2026.</li></ul>Pulse "Continuar a vista previa". Las fechas se escriben en día/mes/año. | Aparece la vista previa del certificado:<ul><li>encabezado "AGENCIA AGRARIA SATIPO – DRA JUNÍN" y título CERTIFICADO;</li><li>"Otorgado a LUCÍA PAREDES QUINTO";</li><li>el texto "Por haber laborado en la Agencia Agraria Satipo como asistente administrativa, del 02/01/2025 al 30/09/2026…";</li><li>la firma del Ing. Carlos Mendoza Rivera;</li><li>la marca de agua "VISTA PREVIA" y el aviso de que la fecha de emisión y el QR se asignan al firmar.</li></ul>Al costado: expediente, DNI y tipo. |
| 2.4 | Pulse "Volver". | Regresa al formulario con todos los datos escritos. Vuelva a pulsar "Continuar a vista previa". |
| 2.5 | Pulse "Enviar a revisión". | Se pide confirmación, con el aviso de que no se podrá modificar mientras esté en revisión. |
| 2.6 | Pulse "Enviar". | "✓ Documento enviado a revisión", con el código de verificación (DRA-2026- y seis caracteres). Anótelo. |
| 2.7 | Abra **Mis documentos**. | El documento aparece con su código, tipo, beneficiario, expediente, fecha de envío y el estado **Pendiente**. |
| 2.8 | Pulse el código. | Se ven los datos y la vista previa, sin ningún botón para editarlo: "Está en revisión del Director: no se puede modificar mientras esté Pendiente". |
| 2.9 | Abra **Nuevo documento** → **Certificado de Prácticas**. Complete los datos con el mismo expediente `EXP-2026-005391` y envíelo. | No se envía: "El número de expediente ya está registrado en otro documento". |
| 2.10 | En otra ventana, ingrese con `msalazar` / `Demo2026` y cambie la temporal por `Propia2026`. Abra **Mis documentos**. Luego escriba la dirección de la plataforma seguida de `#/mis-documentos/` y el código del paso 2.6. | Su lista no muestra el documento de Administración. Por la dirección se indica "Este documento no pertenece a su área". |
| 2.11 | **Opcional:** como `msalazar`, registre una Constancia de Productor Activo (cultivo y sector o comunidad). | Se registra igual, con el texto de la constancia en la vista previa. |

**Para validar con el PO:**

- **Formato del número de expediente:** es provisional (`EXP-AAAA-NNNNNN`, tomado del prototipo). ¿Cuál usa Mesa de Partes?
- **Campos y textos de cada tipo:**

  | Tipo | Campos | Texto |
  |---|---|---|
  | Constancia de Productor Activo | Cultivo principal; sector o comunidad | "Por encontrarse registrado como productor activo en el ámbito de la Agencia Agraria Satipo, dedicado al cultivo de {cultivo} en el sector {sector}." |
  | Certificado de Prácticas | Modalidad (preprofesionales o profesionales), área, inicio y fin | "Por haber realizado sus prácticas {modalidad} en el {área} de la Agencia Agraria Satipo, del {inicio} al {fin}, demostrando responsabilidad y compromiso." |
  | Certificado de Trabajo | Cargo, inicio y fin | "Por haber laborado en la Agencia Agraria Satipo como {cargo}, del {inicio} al {fin}, demostrando responsabilidad y buen desempeño." |

---

## 3. HU09: Registrar una emisión por lista (DRA-20)

**Objetivo:** comprobar la emisión de los certificados de un taller en un solo envío:

- los datos del evento se ingresan una vez;
- la relación de beneficiarios se carga desde Excel o a mano, y cada fila se valida;
- la vista previa muestra un certificado de ejemplo y la relación completa;
- al enviar, se crea un documento por beneficiario, agrupados en un lote.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | Como `rquispe`, abra **Nuevo documento** → **Certificado de Capacitación**. Pulse "Continuar" sin completar nada. | No avanza: los campos vacíos se marcan. El área organizadora ya viene completa con "Área de Capacitación". |
| 3.2 | Complete los datos del taller:<ul><li>nombre `Manejo integrado de plagas en café`;</li><li>fechas del 14/09/2026 al 16/09/2026;</li><li>duración `24` horas;</li><li>lugar `Local comunal de Río Negro, Satipo`.</li></ul>Pulse "Continuar". | Pasa a Beneficiarios: "Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno". "Continuar a vista previa" está deshabilitado. |
| 3.3 | Pulse "Descargar plantilla Excel" y abra el archivo. | Se descarga `plantilla-beneficiarios.xlsx`, con las columnas Nombres, Apellidos y DNI. |
| 3.4 | Pulse "Importar desde Excel" y elija `beneficiarios-prototipo.xlsx`. | "Se importaron 8 beneficiarios desde Excel". La tabla tiene 8 filas. La fila 5 (Wilber) está en rojo con "El DNI debe tener 8 dígitos", y arriba se lee "Hay 1 error en la lista. Corríjalo para continuar". No se puede continuar. |
| 3.5 | Corrija el DNI de la fila 5 a `44198236`. | "✓ 8 beneficiarios listos". |
| 3.6 | Pulse "Agregar beneficiario" y escriba en la fila nueva una persona con el DNI `45218736`, el mismo de la fila 1. | Las dos filas se marcan: "El DNI se repite en la fila 9" en la fila 1 y "El DNI se repite en la fila 1" en la 9. Elimine la fila 9 con "Eliminar". |
| 3.7 | Pulse "Continuar a vista previa". | Aparece el certificado de ejemplo de **JUAN CCORI PARI**, con el texto "…'Manejo integrado de plagas en café', realizado del 14 al 16 de setiembre de 2026 en Local comunal de Río Negro, Satipo, con una duración de 24 horas" y la marca "VISTA PREVIA". El "Resumen del lote" indica 8 certificados, el taller, las fechas y los 8 nombres. |
| 3.8 | Pulse "Volver" y luego otra vez "Continuar a vista previa". | Los 8 beneficiarios se conservan, con el DNI corregido. |
| 3.9 | Pulse "Enviar a revisión". | "¿Enviar 8 certificados a revisión del Director? Mientras estén en revisión no podrá modificarlos". |
| 3.10 | Pulse "Enviar". | "✓ ¡Listo! Se enviaron 8 certificados a revisión (Lote 2026-001)". |
| 3.11 | Abra **Mis documentos**. | El lote aparece en una sola fila: "Lote 2026-001", Certificado de Capacitación, 8 beneficiarios, Pendiente. |
| 3.12 | Pulse el lote. | Se ven los datos del evento, el certificado de ejemplo y la tabla "Certificados del lote", con los 8 beneficiarios y un código distinto para cada uno. No hay botones para editar. |
| 3.13 | Pulse el código de cualquiera de los certificados. | Se abre su detalle. En lugar del expediente se indica su lote, "Lote 2026-001". |
| 3.14 | Como `pmorales`, escriba la dirección de la plataforma seguida de `#/mis-documentos/lote/2026-001`. | "Este lote no pertenece a su área". |
| 3.15 | **Opcional:** como `rquispe`, registre un lote de **Certificado de Reconocimiento** con dos personas escritas a mano. | Se registra como "Lote 2026-002", con el texto del reconocimiento. |

**Para validar con el PO:**

- **Columnas de la plantilla:** son las del prototipo (Nombres, Apellidos, DNI). Se pidió una lista real de beneficiarios para confirmarlas.
- **Máximo por lote:** 300 beneficiarios.
- **Certificado de Reconocimiento:** pide motivo, nombre del evento, fecha, lugar y área organizadora. Su texto es una propuesta del equipo: "En reconocimiento a {motivo}, en el marco de '{evento}', realizado el {fecha} en {lugar}."

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 2. Si nota que falta, no es una observación:

- **Revisar, observar, rechazar y firmar:** el Director todavía no ve los documentos en "Por revisar". Llega en el Sprint 3 (HU10 a HU12).
- **PDF definitivo, QR, IPFS y registro en la blockchain:** llegan en el Sprint 3 (HU16 a HU18). Por eso la vista previa dice que la fecha y el QR se asignan al firmar.
- **Pestañas por estado en Mis documentos:** llegan cuando existan los demás estados. Hoy todo está Pendiente.

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-18 a DRA-20):

- **Si todo se vio como se espera,** deje el comentario `Aprobado` y mueva el ticket a **Listo**.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El ticket queda en "En revisión" y el equipo carga el ajuste para el Sprint 3.
- **Si tiene un cambio de criterio** (por ejemplo, el formato del expediente o un texto), indíquelo en el comentario aunque apruebe. Se registra como cambio para el siguiente Sprint.

Las decisiones se recogen también en el acta de la [revisión del Sprint 2](revision.md).
