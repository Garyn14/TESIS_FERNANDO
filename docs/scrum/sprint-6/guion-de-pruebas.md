# Guion de pruebas del Sprint 6 para el PO

Este guion le permite al Product Owner probar las siete historias del Sprint 6 y decidir si las aprueba. Se prueba lo que usa **Mesa de Partes** para atender al ciudadano (buscar, ver el estado, el historial y entregar documentos) y los **avisos** que recibe cada rol dentro de la plataforma.

Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU22: Buscar documentos | DRA-35 | 3 |
| HU23: Ver el estado de un documento | DRA-36 | 2 |
| HU24: Consultar el historial y la auditoría | DRA-37 | 5 |
| HU25: Descargar o imprimir un documento | DRA-38 | 3 |
| HU26: Aviso de documento pendiente al director | DRA-39 | 2 |
| HU27: Avisos de resultado al Área encargada | DRA-40 | 2 |
| HU28: Avisos de entrega y rechazo a Mesa de Partes | DRA-41 | 2 |

**En la misma sesión** se hacen también los guiones de los Sprints 3, 4 y 5, cuya validación quedó pendiente (tarea DRA-48): [Sprint 3](../sprint-3/guion-de-pruebas.md), [Sprint 4](../sprint-4/guion-de-pruebas.md) y [Sprint 5](../sprint-5/guion-de-pruebas.md). Si se hacen antes, la plataforma ya tiene documentos en todos los estados, y la preparación de este guion se reduce a crear la cuenta de Mesa de Partes (paso 0.1).

## Antes de empezar

El equipo de desarrollo levanta la plataforma como en el Sprint 5:

```bash
./e2e/levantar.sh demo
```

Al terminar, muestra la dirección de la plataforma (<http://localhost:5173>), el usuario `admin` con su contraseña temporal y las dos claves de prueba para MetaMask.

**Las claves son solo de prueba.** Son billeteras nuevas, sin valor. Nunca las use fuera de esta demostración.

Recomendaciones:

- **Siga el guion en orden y en una sola sesión.** Cada vez que la plataforma se vuelve a levantar empieza vacía.
- **Anote el número del paso** si algo no se ve como se espera.
- Para pasar de una cuenta a otra, use "Cerrar sesión" y vuelva a ingresar.

Cuentas que se usan (las de los Sprints 2 a 5, más la de Mesa de Partes):

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| pmorales | Pedro Morales Ccanto | Emisor de área – Área de Administración | Demo2026 | Propia2026 |
| rquispe | Rosa Quispe Huamán | Emisor de área – Área de Capacitación | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |
| lflores | Luz Flores Ticona | Mesa de Partes | Demo2026 | Propia2026 |

---

## 0. Preparación: documentos en todos los estados

**Objetivo:** tener documentos firmados, rechazados, pendientes y un lote. Todo esto se construyó en los Sprints 1 a 5, así que aquí no se evalúa. Si ya hizo los guiones de los Sprints 3 a 5, haga solo el paso 0.1.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Como `admin`, cree las cuentas de la tabla (si no existen), incluida **`lflores`** con el rol **Mesa de Partes**. Registre la billetera del Director y otórguele el rol de firmante, como en el Sprint 4. | La fila del Director dice "✓ Firmante activo". |
| 0.2 | Como `pmorales`, registre cuatro **Certificados de Trabajo** con el cargo `asistente administrativa` y las fechas del 02/01/2025 al 30/09/2026:<ul><li>Lucía Paredes Quinto, DNI `45829364`, expediente `EXP-2026-005391`;</li><li>Kevin Ramos Ccanto, DNI `46385127`, expediente `EXP-2026-005392`;</li><li>Martha Rojas Inga, DNI `44200001`, expediente `EXP-2026-005401`;</li><li>Nilo Huamán Soto, DNI `44200002`, expediente `EXP-2026-005402`.</li></ul> | Los cuatro quedan Pendientes. |
| 0.3 | Como `rquispe`, registre un lote de **Certificados de Capacitación** del evento `Manejo integrado de plagas en café` con tres beneficiarios: Juan Ccori Pari (`45218736`), María Elena Rojas Soto (`47390125`) y Edwin Quispe Huamán (`46001234`). | "Lote 2026-001" con 3 certificados Pendientes. |
| 0.4 | Como `cmendoza`, firme a **Lucía** y a **Kevin** con MetaMask, y **rechace** a **Martha** con el motivo `La persona no laboró en la agencia en las fechas indicadas.` Deje a Nilo y el lote sin tocar. | Lucía y Kevin Firmados; Martha Rechazada. |

---

## 1. HU26: Avisos al Director (DRA-39)

**Objetivo:** comprobar que el Director recibe un aviso dentro de la plataforma por cada documento o lote pendiente, y que el aviso lo lleva a revisarlo.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | Ingrese como `cmendoza` y mire el encabezado. | Junto a su nombre hay una **campana** con un número rojo: la cantidad de avisos sin leer. |
| 1.2 | Pulse la campana. | Se abre el panel **Avisos**, del más reciente al más antiguo, cada uno con su antigüedad ("hace 5 min") y un punto verde si no se leyó:<ul><li>"Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)" (**un solo aviso** para los 3 certificados);</li><li>"Nuevo documento pendiente: Certificado de Trabajo – …" por cada documento.</li></ul> |
| 1.3 | Pulse el aviso del lote. | Se abre la revisión del Lote 2026-001. Al volver a abrir la campana, ese aviso ya no tiene el punto y el número bajó en uno. |
| 1.4 | Pulse "Marcar todos como leídos". | La campana queda sin número. |
| 1.5 | Pulse fuera del panel, o la tecla Escape. | El panel se cierra. |

## 2. HU22: Buscar documentos (DRA-35)

**Objetivo:** comprobar que Mesa de Partes ubica cualquier documento de cualquier área por nombre, DNI, código, expediente o lote.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Ingrese como `lflores` y abra **Buscar documentos**. | El menú tiene Inicio y Buscar documentos. La tabla muestra los documentos de las dos áreas, del más reciente al más antiguo, cada uno con su estado y su color. El lote ocupa una sola fila, con "3 certificados". |
| 2.2 | Escriba `huaman` (sin tilde). | Aparecen Nilo Huamán Soto y el Lote 2026-001 **ya desplegado**, solo con Edwin Quispe Huamán y la nota "1 de 3 coinciden con la búsqueda". |
| 2.3 | Escriba `soto nilo`. | Solo Nilo: deben aparecer todas las palabras, en cualquier orden. |
| 2.4 | Pruebe con el DNI `45829364`, con el expediente `005402` y con los seis caracteres finales del código de Kevin en minúsculas. | Cada búsqueda encuentra su documento. |
| 2.5 | Escriba `2026-001` y pulse "▸ Lote 2026-001". | El lote aparece plegado y se despliega en sus 3 certificados. |
| 2.6 | Borre el texto y pruebe los filtros **Firmados**, **Rechazados** y **En trámite**. | Firmados: Lucía y Kevin. Rechazados: Martha. En trámite: Nilo y el lote. |
| 2.7 | Escriba `Nadie Conestenombre`, y luego una sola letra. | "No se encontraron documentos con «Nadie Conestenombre». Revise lo que escribió o busque por otro dato." Con una letra: "Escriba al menos 2 caracteres." |

## 3. HU23 y HU24: La ficha, el historial y la auditoría (DRA-36, DRA-37)

**Objetivo:** comprobar que Mesa de Partes puede explicarle al ciudadano en qué estado está su documento y demostrar su trazabilidad.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | Busque `45829364` y pulse el código de Lucía. | Se abre la **ficha**: el código, "Firmado" y la explicación "Firmado y registrado en la blockchain. Se puede entregar al ciudadano.", con las fechas de envío y de firma, y los datos (beneficiario, DNI, tipo, origen, expediente, área). |
| 3.2 | Pulse "← Volver a Buscar documentos". | Vuelve a la búsqueda con `45829364` todavía escrito. |
| 3.3 | Abra la ficha de **Martha**. | "El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite.", con el **motivo del rechazo**. |
| 3.4 | Baje hasta el **Historial** de la ficha de Lucía. | Cada evento tiene su título, su fecha y hora, y su responsable con su rol: "Registrado y enviado a revisión" por Pedro Morales Ccanto (Emisor de área), "Revisado por el Director", "Firma iniciada: PDF final guardado en IPFS" y "Firmado y registrado en la blockchain". |
| 3.5 | Debajo, pulse "▸ Detalle técnico de auditoría". | Estaba **plegado**. Al abrirlo se ven la huella digital del PDF (SHA-256), el identificador en IPFS (CID), la transacción y el bloque de la firma, la billetera firmante y el contrato, cada uno con un botón "Copiar". |
| 3.6 | Abra la ficha de **Nilo** y su detalle técnico. | "Está en revisión del Director. Todavía no se puede entregar." y "Todavía no tiene registro en la blockchain." |

## 4. HU25: Descargar o imprimir (DRA-38)

**Objetivo:** comprobar que Mesa de Partes entrega el documento firmado, impreso o en PDF, sin una nueva firma, y que cada entrega queda registrada.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 4.1 | En Buscar documentos, pulse el filtro **Listos para entregar**. | Lucía y Kevin: los firmados que todavía no se entregaron. |
| 4.2 | Abra la ficha de **Lucía**. | Una sección con "Listo para entregar" y los botones **Ver documento**, **Descargar PDF** e **Imprimir**. |
| 4.3 | Pulse **Ver documento**. | Se abre el certificado firmado en otra pestaña, con su QR y su código. |
| 4.4 | Pulse **Descargar PDF**. | Se guarda el archivo `DRA-2026-….pdf`. La sección dice "Entregado: impreso 0 veces, descargado 1 vez", y el historial suma "PDF descargado por Luz Flores Ticona (Mesa de Partes)". |
| 4.5 | Pulse **Imprimir**. Cancele el diálogo de impresión. | Se abre el diálogo de impresión del navegador con el certificado. El historial suma "Impreso", y el botón cambia a **Imprimir duplicado**. |
| 4.6 | Pulse **Imprimir duplicado** y cancele el diálogo. | El historial suma "Duplicado impreso": "Duplicado impreso por Luz Flores Ticona (Mesa de Partes). Impresión n.° 2". |
| 4.7 | Vuelva a Buscar documentos con el filtro **Listos para entregar**. | Solo Kevin: Lucía ya se entregó. |
| 4.8 | Abra la ficha de **Martha**. | No tiene botones de entrega: solo se entrega un documento firmado. |

## 5. HU27 y HU28: Avisos al área y a Mesa de Partes (DRA-40, DRA-41)

**Objetivo:** comprobar que el área y Mesa de Partes reciben un aviso de cada resultado que les toca, con el motivo y el expediente.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 5.1 | Como `lflores`, abra la campana. | Avisos de **Mesa de Partes**:<ul><li>"Listo para entregar: Certificado de Trabajo – Lucía Paredes Quinto (expediente EXP-2026-005391)" y el de Kevin;</li><li>"Rechazado: Certificado de Trabajo – Martha Rojas Inga (expediente EXP-2026-005401). Motivo: …".</li></ul> |
| 5.2 | Pulse el aviso de Kevin. | Se abre su ficha, con los botones para imprimirlo. |
| 5.3 | Ingrese como `pmorales` y abra la campana. | Avisos del **Área de Administración**: "Firmado: …" de Lucía y de Kevin, y "Rechazado: … Martha Rojas Inga. Motivo: …". |
| 5.4 | Pulse el aviso del rechazo. | Se abre el documento en Mis documentos, con el motivo. |
| 5.5 | Como `cmendoza`, en la revisión del **Lote 2026-001**, **observe** a Juan y a María Elena con el motivo `Falta el segundo apellido.`, y firme el lote con MetaMask ("Firmar lote"). | Juan y María Elena Observados; Edwin Firmado. |
| 5.6 | Ingrese como `rquispe` y abra la campana. | Del **Área de Capacitación**, un solo aviso por cada decisión sobre el lote: "Lote 2026-001 – Manejo integrado de plagas en café: 2 certificados observados. Motivo: Falta el segundo apellido." y "…: 1 certificado firmado". Al pulsarlo se abre el lote. |
| 5.7 | Como `lflores`, abra la campana. | "Listo para entregar: Lote 2026-001 – Manejo integrado de plagas en café: 1 certificado firmado". Al pulsarlo, Buscar documentos busca el lote. La observación no se avisa a Mesa de Partes. |

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 6. Si nota que falta, no es una observación:

- **Publicar la plataforma y el portal en internet:** requiere la infraestructura en AWS (DRA-44).
- **Imprimir todo un lote de una vez** ("Imprimir lote" del prototipo): es una de las [preguntas abiertas](revision.md#decisiones-a-validar).
- **Avisos por correo o SMS:** la tesis define los avisos como internos.

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-35 a DRA-41):

- **Si todo se vio como se espera,** deje el comentario `Aprobado`.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El equipo lo registra como un **ticket nuevo**: las historias cerradas no se reabren.
- **Si tiene un cambio de criterio** sobre las [decisiones de la revisión](revision.md#decisiones-a-validar) o una respuesta a las preguntas nuevas, indíquelo en el comentario aunque apruebe.

Al terminar los guiones de los Sprints 3 a 6, el resultado se resume en **DRA-48**.
