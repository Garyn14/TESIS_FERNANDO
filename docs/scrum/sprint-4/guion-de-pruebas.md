# Guion de pruebas del Sprint 4 para el PO

Este guion le permite al Product Owner probar las cinco historias del Sprint 4 desde la pantalla y decidir si las aprueba. Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU13: Observar un documento | DRA-27 | 3 |
| HU14: Rechazar un documento | DRA-28 | 3 |
| HU15: Corregir y reenviar un documento observado | DRA-29 | 5 |
| HU29: Anular un documento firmado | DRA-30 | 8 |
| HU30: Reemitir un documento con datos corregidos | DRA-31 | 8 |

Si el Sprint 3 todavía no se revisó, se puede hacer una sola sesión: primero el [guion del Sprint 3](../sprint-3/guion-de-pruebas.md) y después este, sobre la misma plataforma. La preparación de este guion repite los pasos del Sprint 3 que se necesitan.

## Antes de empezar

El equipo de desarrollo levanta la plataforma con `./e2e/levantar.sh demo`, sin datos, igual que en el Sprint 3. Al terminar, muestra lo que se le entrega al PO:

- la dirección de la plataforma (<http://localhost:5173>) y el usuario `admin` con su contraseña temporal;
- **dos claves privadas de prueba** para importar en MetaMask, la del Administrador del contrato y la del Director, más la dirección de la billetera del Director;
- el archivo Excel `beneficiarios-prototipo.xlsx` (en `plataforma/e2e/datos/`).

**Las claves son solo de prueba.** Son billeteras nuevas, sin valor, creadas para esta demostración. Nunca use estas claves fuera de ella ni use una billetera propia.

Para firmar, anular y reemitir se necesita **MetaMask** en el navegador (Chrome, Firefox, Edge o Brave):

1. En MetaMask, use "Importar cuenta" dos veces, una con cada clave privada. Puede renombrarlas "Administrador (prueba)" y "Director (prueba)".
2. La plataforma propone su red (Plataforma DRA Satipo, chainId 20260) la primera vez. Acéptela. La red no cobra: el costo de cada operación es cero.

Recomendaciones:

- **Siga el guion en orden y en una sola sesión.** Cada vez que la plataforma se vuelve a levantar empieza vacía.
- **MetaMask solo funciona en la ventana normal.** Use la ventana normal para el Administrador y el Director. Use una de incógnito (u otro navegador) para las áreas.
- **Anote el número del paso** si algo no se ve como se espera.
- Algunos pasos dicen **"con ayuda del equipo"**: piden ejecutar `./e2e/ver-registro.sh` en la computadora donde corre la plataforma. Así se ven la transacción, el bloque y el historial, porque la pantalla de auditoría llega en el Sprint 6 (HU24).

Cuentas que se usan (las mismas de los Sprints 2 y 3):

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| rquispe | Rosa Quispe Huamán | Área encargada – Área de Capacitación | Demo2026 | Propia2026 |
| pmorales | Pedro Morales Ccanto | Área encargada – Área de Administración | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |

---

## 0. Preparación: cuentas, billetera del Director y documentos

**Objetivo:** dejar listos al Director con su billetera y los documentos del Sprint. Esto se aprobó en los Sprints 1 a 3, así que aquí no se evalúa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Ingrese con `admin`, cambie la contraseña temporal por `AdminPropia26` y cree en **Usuarios** las tres cuentas de la tabla, con la temporal `Demo2026`. | Las tres cuentas aparecen activas. |
| 0.2 | En **Billetera del director**, registre la dirección del Director que entregó el equipo. Con la cuenta **Administrador (prueba)** en MetaMask, otórguele el rol de firmante, como en el paso 0.3 del Sprint 3. | La fila dice "✓ Firmante activo". |
| 0.3 | En la ventana de incógnito, ingrese con `pmorales` (cambie la temporal por `Propia2026`) y registre tres **Certificados de Trabajo**, con el cargo `asistente administrativa` y las fechas del 02/01/2025 al 30/09/2026:<ul><li>Lucía Paredes Quinto, DNI `45829364`, expediente `EXP-2026-005391`;</li><li>Kevin Ramos Ccanto, DNI `46385127`, expediente `EXP-2026-005392`;</li><li>Martha Rojas Inga, DNI `44200001`, expediente `EXP-2026-005401`.</li></ul> | Los tres quedan Pendientes en Mis documentos. |
| 0.4 | Cierre la sesión e ingrese con `rquispe`. Registre el lote del taller **Manejo integrado de plagas en café** con `beneficiarios-prototipo.xlsx`, como en el Sprint 2: pasos 3.2 a 3.10, corrigiendo el DNI de Wilber a `44198236`. | "Se enviaron 8 certificados a revisión (Lote 2026-001)". |
| 0.5 | En la ventana normal, ingrese con `cmendoza` (cambie la temporal por `Propia2026`) y elija la cuenta **Director (prueba)** en MetaMask. | Por revisar muestra a Lucía, Kevin, Martha y el Lote 2026-001. |

---

## 1. HU13: Observar un documento (DRA-27)

**Objetivo:** comprobar que el Director observa un documento a solicitud de parte con un motivo obligatorio, y que el documento vuelve al área con ese motivo.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | Como Director, abra la revisión de **Lucía** y pulse **Observar**. | Se abre "Observar documento" con el campo Motivo ("Explique qué debe corregirse"). "Confirmar" está deshabilitado mientras el motivo esté vacío o tenga solo espacios. |
| 1.2 | Escriba `El cargo no coincide con el contrato de trabajo` y pulse "Confirmar". | "El documento fue observado y volvió al área.", con el motivo. Ya no hay botones para firmar ni observar. |
| 1.3 | Vuelva a **Por revisar**. | Lucía ya no está. Kevin, Martha y el lote siguen. |
| 1.4 | Como `pmorales`, abra **Mis documentos** y el detalle de Lucía. | Lucía aparece **Observado**, en naranja. El detalle dice "El Director lo observó y lo devolvió al área para que lo corrija." y muestra el motivo. |

---

## 2. HU14: Rechazar un documento (DRA-28)

**Objetivo:** comprobar que el Director rechaza un documento con un motivo obligatorio, y que el rechazo es definitivo.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como Director, abra la revisión de **Kevin** y pulse **Rechazar** (rojo). | Se abre "Rechazar documento" con el campo Motivo y el aviso "El rechazo es definitivo. El documento no podrá reenviarse." "Confirmar" está deshabilitado sin motivo. |
| 2.2 | Escriba `El solicitante no laboró en la agencia en ese periodo` y pulse "Confirmar". | "El documento fue rechazado.", con el motivo y sin botones. |
| 2.3 | Vuelva a Por revisar. | Kevin ya no está. |
| 2.4 | Como `pmorales`, abra el detalle de Kevin. | Kevin aparece **Rechazado**, en rojo: "El Director lo rechazó. El rechazo es definitivo." y el motivo. No hay opción para corregirlo. |

---

## 3. HU15: Corregir y reenviar un documento observado (DRA-29)

**Objetivo:** comprobar que el área corrige un documento observado y lo reenvía con el mismo código. Se prueba con un documento a solicitud de parte y con un certificado de un lote.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | Como `pmorales`, en el detalle de Lucía, pulse **Corregir y reenviar**. | "Corregir y reenviar – Certificado de Trabajo", con el motivo de la observación arriba y el formulario precargado (expediente, nombres, apellidos, cargo y fechas en día/mes/año). |
| 3.2 | Cambie el cargo a `secretaria` y los apellidos a `Paredes Quintana`. Pulse "Continuar a vista previa". | El certificado dice "como secretaria" y muestra "LUCÍA PAREDES QUINTANA". |
| 3.3 | Pulse "Reenviar a revisión" y confirme. | "✓ Documento corregido y reenviado a revisión", con **el mismo código** de antes. En Mis documentos vuelve a estar Pendiente. |
| 3.4 | Como Director, abra Por revisar. | Lucía Paredes Quintana aparece con la etiqueta **Corregido** y "Sin revisar": la revisión anterior no cuenta. Al abrirla se ve el texto nuevo. |
| 3.5 | Como Director, abra el **Lote 2026-001**, marque a **Gladys Sanchez Ñaupari** y pulse "Observar seleccionados" con el motivo `El apellido no coincide con el DNI`. | Gladys queda Observado. |
| 3.6 | Como `rquispe`, abra el lote en Mis documentos. En la fila de Gladys pulse **Corregir**. | Se abre "Corregir certificado" con el motivo y solo los campos Nombres, Apellidos y DNI: los datos del taller no cambian. |
| 3.7 | Escriba en DNI `45218736` (el de Juan) y pulse "Reenviar a revisión". | "El DNI ya está en otro certificado de este lote." |
| 3.8 | Devuelva el DNI de Gladys, cambie los apellidos a `Sánchez Ñaupari` y pulse "Reenviar a revisión". | Aviso de que se corrigió y se reenvió. Gladys vuelve a **Pendiente** en el lote. |
| 3.9 | Como Director, abra Por revisar. | El Lote 2026-001 tiene la etiqueta **Corregido**. |

---

## 4. Preparación: firmar lo que se va a anular y reemitir

**Objetivo:** dejar documentos firmados para HU29 y HU30. La firma se aprobó en el Sprint 3, así que aquí no se evalúa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 4.1 | Como Director, abra Lucía y pulse **Firmar** → "Confirmar", y confirme en MetaMask. | "¡Listo! Se firmó 1 documento." |
| 4.2 | Haga lo mismo con **Martha**. | "¡Listo! Se firmó 1 documento." |
| 4.3 | Abra el Lote 2026-001 y pulse **Firmar lote** → "Confirmar", y confirme en MetaMask. | "¡Listo! Se firmaron 8 certificados." Por revisar queda al día. |

---

## 5. HU29: Anular un documento firmado (DRA-30)

**Objetivo:** comprobar que el Director anula un documento firmado con un motivo y su billetera, que la anulación queda en la blockchain y que, si cancela en la billetera, el documento sigue firmado.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 5.1 | Como Director, abra **Documentos firmados**. | La tabla muestra los firmados, del más reciente al más antiguo:<ul><li>código o lote, tipo, beneficiario con su DNI, área, fecha de firma y estado;</li><li>Lucía y Martha en filas propias;</li><li>el Lote 2026-001 en una fila, con "Manejo integrado de plagas en café · 8 certificados".</li></ul> |
| 5.2 | Escriba `martha` en "Buscar por nombre o código". Borre la búsqueda y pulse "▸ Lote 2026-001". | La búsqueda deja solo a Martha. El lote se despliega con sus 8 certificados, cada uno con su botón "Anular". |
| 5.3 | En la fila de Martha pulse **Anular**. | Se abre "Anular documento" con el campo Motivo y el aviso "La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad." "Confirmar" está deshabilitado sin motivo. |
| 5.4 | Escriba `El certificado se emitió con el cargo equivocado` y pulse "Confirmar". | La ventana "Anular con su billetera" muestra:<ul><li>"Cuenta: Ing. Carlos Mendoza Rivera (0x…)";</li><li>"Acción: Anular 1 documento";</li><li>el documento y la red;</li><li>"Costo de la operación: Sin costo".</li></ul> |
| 5.5 | Pulse "Confirmar" y confirme en MetaMask. | "Documento anulado. [código] – Martha Rojas Inga. Ya no es válido." |
| 5.6 | Pulse "Volver a Documentos firmados". | Martha aparece **Anulado** (gris y tachado), con su motivo y sin botón "Anular". |
| 5.7 | En un certificado del lote (por ejemplo, Nelly) pulse Anular, escriba un motivo y, en MetaMask, **rechace** la operación. | "Anulación cancelada en la billetera. El documento sigue firmado." Al cerrar, la fila sigue Firmado y con su botón "Anular". |
| 5.8 | Como `pmorales`, abra Mis documentos y el detalle de Martha. | Martha aparece Anulado (gris y tachado). El detalle dice "El Director lo anuló: ya no es válido. La anulación está registrada en la blockchain." y muestra el motivo. |
| 5.9 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh` y, con el código de Martha, `./e2e/ver-registro.sh <código>`. | Martha está ANULADO con su transacción de anulación. El historial termina en "Anulado por Ing. Carlos Mendoza Rivera con la billetera 0x…; transacción …; bloque …. Motivo: …". |

---

## 6. HU30: Reemitir un documento con datos corregidos (DRA-31)

**Objetivo:** comprobar que el área reemite un documento firmado con los datos corregidos y un motivo, que el Director ve los cambios, y que al firmar la reemisión el original se anula en la misma transacción de la blockchain.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 6.1 | Como `pmorales`, abra el detalle de Lucía (Firmado) y pulse **↻ Reemitir con corrección**. | "Reemitir con corrección – Certificado de Trabajo", con el aviso "Reemisión de [código]. Cuando el Director firme el nuevo documento, el original se anulará automáticamente." El formulario está precargado. El número de expediente se muestra pero **no se puede cambiar**. Al final aparece el campo **Motivo de la reemisión**. |
| 6.2 | Pulse "Continuar a vista previa" sin cambiar nada. | "Ingrese el motivo de la reemisión." |
| 6.3 | Escriba el motivo `El cargo correcto es secretaria ejecutiva` y pulse otra vez "Continuar a vista previa". | "Corrija al menos un dato del documento." |
| 6.4 | Cambie el cargo a `secretaria ejecutiva` y pulse "Continuar a vista previa" → "Enviar a revisión". | La confirmación avisa que, cuando el Director lo firme, el original se anulará automáticamente. |
| 6.5 | Pulse "Enviar". | "✓ Reemisión enviada a revisión", con **un código nuevo**. "El original … sigue firmado hasta que el Director firme la reemisión." |
| 6.6 | Abra el detalle del original (Lucía, código antiguo). | Sigue **Firmado**, con "Reemisión en revisión: [código nuevo]". Ya no ofrece "Reemitir con corrección". |
| 6.7 | Como Director, abra **Documentos firmados**. | En la fila de Lucía, en lugar de "Anular": "Reemisión en revisión: [código nuevo]. Se anulará al firmarla." |
| 6.8 | Abra **Por revisar**. | Lucía aparece con la etiqueta **Reemisión**. |
| 6.9 | Abra su revisión. | Arriba: "↻ Este documento reemplaza a [código antiguo]", los cambios ("Cargo: secretaria → secretaria ejecutiva") y el motivo. "Al firmarlo, el original se anula en la misma operación de la blockchain." |
| 6.10 | Pulse **Firmar** → "Confirmar" y confirme en MetaMask **una sola vez**. | "¡Listo! Se firmó 1 documento." |
| 6.11 | Como `pmorales`, abra el detalle del original. | **Anulado**: "Se anuló al firmarse su reemisión", "Reemplazado por [código nuevo]" (con enlace) y el motivo "Reemplazado por … Motivo de la reemisión: …". |
| 6.12 | Pulse el enlace al código nuevo. | La reemisión está **Firmada**, con "Reemisión de [código antiguo]" y el motivo. |
| 6.13 | Como `rquispe`, abra el lote en Mis documentos. En la fila de **Juan Ccori Pari** (Firmado) pulse **↻ Reemitir con corrección**. | Se abre "Reemitir certificado" con el aviso de la reemisión, los campos Nombres, Apellidos y DNI y el Motivo de la reemisión. |
| 6.14 | Cambie los apellidos a `Ccori Párraga`, escriba el motivo `El segundo apellido no coincide con el DNI` y pulse "Enviar a revisión". | "✓ La reemisión de [código] se envió a revisión con el código [nuevo]." El lote tiene ahora 9 certificados. Juan Ccori Pari sigue Firmado, con "Reemisión en revisión". |
| 6.15 | Como Director, abra Por revisar y el Lote 2026-001. | El lote tiene la etiqueta **Reemisión**. En la relación: "↻ Reemisión de [código]: Apellidos: Ccori Pari → Ccori Párraga". |
| 6.16 | Pulse **Firmar lote** → "Confirmar" y confirme en MetaMask. | "Firmar 1 certificado". Al terminar: "¡Listo! Se firmó 1 certificado." |
| 6.17 | Como `rquispe`, recargue el lote. | El certificado original de Juan está **Anulado**, con el motivo "Reemplazado por …". La reemisión está Firmada en el mismo lote. |
| 6.18 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh`. | Los originales de Lucía y de Juan están ANULADO, con la columna "Reemplazado por". Su "Tx. anulación" es **la misma** transacción que la de su reemisión: se anularon en la misma operación. |

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 4. Si nota que falta, no es una observación:

- **Portal público de verificación** (al que lleva el QR), que mostrará "Anulado" y "Reemplazado por": llega en el Sprint 5 (HU19 a HU21). El contrato ya guarda la anulación y el reemplazo.
- **Búsqueda avanzada, estado, historial y auditoría:** llegan en el Sprint 6 (HU22 a HU24). Mientras tanto, el equipo los muestra con `./e2e/ver-registro.sh`.
- **Descargar o imprimir el PDF firmado:** llega con HU25. El detalle sigue mostrando la plantilla con la marca VISTA PREVIA, también en los firmados.
- **Avisos al Director, al área y a Mesa de Partes** (por ejemplo, el aviso de un rechazo): llegan en el Sprint 6 (HU26 a HU28).

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-27 a DRA-31):

- **Si todo se vio como se espera,** deje el comentario `Aprobado` y mueva el ticket a **Listo**.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El ticket queda en "En revisión" y el equipo carga el ajuste para el Sprint 5.
- **Si tiene un cambio de criterio** (por ejemplo, sobre las decisiones de la [revisión del Sprint 4](revision.md#decisiones-a-validar)), indíquelo en el comentario aunque apruebe. Se registra como cambio para el siguiente Sprint.

Las decisiones se recogen también en el acta de la [revisión del Sprint 4](revision.md).
