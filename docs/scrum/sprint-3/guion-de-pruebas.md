# Guion de pruebas del Sprint 3 para el PO

Este guion le permite al Product Owner probar las seis historias del Sprint 3 desde la pantalla y decidir si las aprueba. Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU10: Ver los documentos por revisar | DRA-21 | 3 |
| HU16: Generar el PDF final y su hash | DRA-24 | 5 |
| HU11: Firmar uno o varios documentos | DRA-22 | 13 |
| HU12: Revisar y firmar un lote | DRA-23 | 8 |
| HU17: Almacenar el PDF en IPFS | DRA-25 | 5 |
| HU18: Sincronizar los estados con la blockchain | DRA-26 | 13 |

Las historias van en el orden en que se usan, no en el de su número: primero se revisa, luego se firma.

## Antes de empezar

El equipo de desarrollo levanta la plataforma con `./e2e/levantar.sh demo`, sin datos. Ese comando también levanta:

- la red blockchain (Besu) con un contrato recién desplegado;
- el almacenamiento IPFS privado.

Al terminar, muestra en pantalla lo que se le entrega al PO:

- la dirección de la plataforma (<http://localhost:5173>) y el usuario `admin` con su contraseña temporal;
- **dos claves privadas de prueba** para importar en MetaMask, la del Administrador del contrato y la del Director, más la dirección de la billetera del Director;
- el archivo Excel `beneficiarios-prototipo.xlsx` (en `plataforma/e2e/datos/`).

**Las claves son solo de prueba.** Son billeteras nuevas, sin valor, creadas para esta demostración. Nunca use estas claves fuera de ella ni use una billetera propia.

Para firmar se necesita **MetaMask** instalada en el navegador (Chrome, Firefox, Edge o Brave):

1. En MetaMask, use "Importar cuenta" dos veces, una con cada clave privada. Puede renombrarlas "Administrador (prueba)" y "Director (prueba)".
2. La red de la plataforma (Plataforma DRA Satipo, chainId 20260) la propone la propia plataforma la primera vez. Acéptela. La red no cobra: el costo de cada operación es cero.

Recomendaciones:

- **Siga el guion en orden y en una sola sesión.** Cada vez que la plataforma se vuelve a levantar empieza vacía.
- **MetaMask solo funciona en la ventana normal.** Use la ventana normal para el Administrador y el Director. Use una de incógnito (u otro navegador) para las áreas.
- **Anote el número del paso** si algo no se ve como se espera.
- Algunos pasos dicen **"con ayuda del equipo"**: piden ejecutar un comando en la computadora donde corre la plataforma. Por ejemplo, ver el CID o el historial con `./e2e/ver-registro.sh`, porque esas pantallas llegan en el Sprint 4 (HU24).

Cuentas que se usan (las mismas del Sprint 2):

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| rquispe | Rosa Quispe Huamán | Área encargada – Área de Capacitación | Demo2026 | Propia2026 |
| pmorales | Pedro Morales Ccanto | Área encargada – Área de Administración | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |

---

## 0. Preparación: cuentas, billetera del Director y documentos

**Objetivo:** dejar listos al Director con su billetera y los documentos que se revisan y firman. Esto se aprobó en los Sprints 1 y 2, así que aquí no se evalúa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Ingrese con `admin`, cambie la contraseña temporal por `AdminPropia26` y cree en **Usuarios** las tres cuentas de la tabla, con la temporal `Demo2026`. | Las tres cuentas aparecen activas. |
| 0.2 | En **Billetera del director**, pulse "Registrar la billetera de cmendoza" y pegue la dirección del Director que entregó el equipo. Pulse "Guardar billetera". | La fila muestra la dirección y "Sin rol de firmante". |
| 0.3 | En MetaMask, elija la cuenta **Administrador (prueba)**. Pulse "Otorgar el rol de firmante a cmendoza" → "Conectar billetera y continuar" → "Confirmar en la billetera", y confirme en MetaMask. | "Rol de firmante otorgado". La fila dice "✓ Firmante activo". |
| 0.4 | En la ventana de incógnito, ingrese con `pmorales` (cambie la temporal por `Propia2026`) y registre dos **Certificados de Trabajo**, como en el Sprint 2:<ul><li>Lucía Paredes Quinto, DNI `45829364`, expediente `EXP-2026-005391`;</li><li>Kevin Ramos Ccanto, DNI `46385127`, expediente `EXP-2026-005392`.</li></ul>Use el cargo `asistente administrativa` y las fechas del 02/01/2025 al 30/09/2026. | Los dos quedan Pendientes en Mis documentos. |
| 0.5 | Cierre la sesión e ingrese con `rquispe`. Registre el lote del taller **Manejo integrado de plagas en café** con `beneficiarios-prototipo.xlsx`, como en el Sprint 2: pasos 3.2 a 3.10, corrigiendo el DNI de Wilber a `44198236`. | "Se enviaron 8 certificados a revisión (Lote 2026-001)". |

---

## 1. HU10: Ver los documentos por revisar (DRA-21)

**Objetivo:** comprobar que el Director ve los pendientes de todas las áreas, del más antiguo al más reciente, con cada lote en una sola fila. También, que abrir un documento o un lote queda registrado como revisión.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | En la ventana normal, ingrese con `cmendoza` (cambie la temporal por `Propia2026`) y abra **Por revisar**. | "Documentos enviados por las áreas, del más antiguo al más reciente." Hay tres filas, en el orden de envío: Lucía, Kevin y "▤ Lote 2026-001 · Manejo integrado de plagas en café · 8 certificados". Todas dicen "Sin revisar" y sus casillas están deshabilitadas. |
| 1.2 | Pulse **Lucía Paredes Quinto**. | "Revisión – Certificado de Trabajo", con el expediente, el área, quién lo envió, la fecha y el certificado con la marca VISTA PREVIA. Abajo: "✓ Quedó registrado como revisado". |
| 1.3 | Pulse "← Volver a Por revisar". | La fila de Lucía dice "✓ Revisado" y su casilla ya se puede marcar. |
| 1.4 | Abra el **Lote 2026-001**. Recorra los certificados con "Siguiente ›" y pulse un nombre en la relación de la derecha. | "Revisión de lote – Lote 2026-001", con los datos del evento. Se ve "Certificado 1 de 8" y, al pulsar un nombre, su certificado. |
| 1.5 | Vuelva a Por revisar. | El lote dice "✓ Revisado": abrirlo cuenta para sus 8 certificados. Kevin sigue "Sin revisar". |
| 1.6 | En la ventana de incógnito, como `rquispe`, escriba la dirección seguida de `#/por-revisar`. | "No tiene permiso para ver esta sección." |

---

## 2. HU16: Generar el PDF final y su hash (DRA-24)

**Objetivo:** comprobar que el PDF definitivo tiene la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como Director, abra la revisión de Lucía y pulse "Ver muestra del PDF final ↗". | Se abre un PDF A4 horizontal con el diseño de la vista previa, en una sola hoja:<ul><li>"Fecha de emisión: [hoy, con el mes en letras]";</li><li>el código QR con el código DRA-2026-… debajo;</li><li>la firma del Ing. Carlos Mendoza Rivera con "Firmado digitalmente mediante blockchain";</li><li>la leyenda "Verifique la autenticidad de este documento en localhost:5174 con el código …";</li><li>la marca **"MUESTRA – SIN VALOR"**.</li></ul>No muestra el DNI. |
| 2.2 | Lea el QR con la cámara del celular. | Muestra una dirección `http://localhost:5174/verificar/…`, con un código largo que no es el DNI. **El portal todavía no existe** (Sprint 5): es normal que el celular no la abra. |
| 2.3 | En la revisión del lote, pase al certificado 2 y abra su muestra. | El PDF de María Elena Rojas Soto, con su propio código y el texto del taller. |

---

## 3. HU11: Firmar uno o varios documentos (DRA-22)

**Objetivo:** comprobar que el Director firma con su billetera y que el documento queda registrado en la blockchain. Antes de firmar, se verifica la billetera y la red. Si algo falla, el documento vuelve a Pendiente sin afectar a los demás.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | En MetaMask, elija la cuenta **Administrador (prueba)**. Abra la revisión de Lucía y pulse **Firmar**. | La ventana "Firmar con su billetera" avisa que la billetera conectada **no es la registrada** para su cuenta, y no deja continuar. |
| 3.2 | En MetaMask, cambie a la cuenta **Director (prueba)** y pulse "Intentar nuevamente". | La ventana muestra:<ul><li>"Cuenta: Ing. Carlos Mendoza Rivera (0x…)";</li><li>"Acción: Firmar 1 documento";</li><li>la red;</li><li>"Costo de la operación: Sin costo".</li></ul> |
| 3.3 | Pulse "Confirmar" y confirme en MetaMask. | Avanza por "Verificando su billetera", "Preparando los documentos", "Registrando la firma" y "Confirmando el registro". Termina en "¡Listo! Se firmó 1 documento." |
| 3.4 | Pulse "Volver a Por revisar". | Lucía ya no está en la bandeja. |
| 3.5 | Como `pmorales`, abra **Mis documentos** y el detalle de Lucía. | Lucía aparece **Firmado**, en verde. El detalle dice "Firmado por el Director y registrado en la blockchain." Kevin sigue Pendiente. |
| 3.6 | Como Director, abra Kevin (queda revisado), vuelva a Por revisar y marque su casilla. | Aparece la barra "1 seleccionado (1 certificado)" con "Firmar seleccionados". |
| 3.7 | Pulse "Firmar seleccionados" → "Confirmar" y, en MetaMask, **rechace** la operación. | "No se firmó ningún documento." "1 documento no se pudo firmar y volvió a Por revisar: Certificado de Trabajo – Kevin Ramos Ccanto: Firma cancelada en la billetera." |
| 3.8 | Vuelva a Por revisar. | Kevin sigue ahí, revisado. No se registró nada en la blockchain. |
| 3.9 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh`. | La tabla muestra a Lucía con su fecha de firma, el bloque, la transacción y el enlace a su PDF en IPFS. |

Kevin se usa luego en HU17 y HU18: no lo firme todavía.

---

## 4. HU12: Revisar y firmar un lote (DRA-23)

**Objetivo:** comprobar que en un lote se puede observar o rechazar a algunos beneficiarios, o al lote completo, con un motivo, y firmar el resto como unidad. Es el flujo F3 del prototipo.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 4.1 | Abra la revisión del Lote 2026-001. | Debajo de la relación están los botones "Rechazar lote", "Observar lote", "Rechazar seleccionados", "Observar seleccionados" (los dos últimos deshabilitados) y "Firmar lote". |
| 4.2 | Marque a **Gladys Sanchez Ñaupari** y pulse "Observar seleccionados". | Se abre "Observar beneficiarios seleccionados" con el campo Motivo ("Explique qué debe corregirse"). "Confirmar" está deshabilitado mientras el motivo esté vacío. |
| 4.3 | Escriba `El DNI no coincide con la lista de asistencia del taller` y pulse "Confirmar". | "1 certificado fue observado y volvió al área." Gladys aparece **Observado** en la relación, sin casilla. |
| 4.4 | Marque a **Edison Shimpukat Kinchokre** y pulse "Rechazar seleccionados". | La ventana avisa: "El rechazo es definitivo. El documento no podrá reenviarse." |
| 4.5 | Escriba `No asistió al taller` y confirme. | "1 certificado fue rechazado." Edison aparece **Rechazado**. Debajo: "cuenta para sus 6 certificados pendientes". |
| 4.6 | Pulse **Firmar lote** → "Confirmar" y confirme en MetaMask. | "Firmar 6 certificados". Al terminar: "¡Listo! Se firmaron 6 certificados.", "1 certificado fue observado y devuelto al área." y "1 certificado fue rechazado." |
| 4.7 | Como `rquispe`, abra **Mis documentos**. | El lote muestra "Observado 1", "Firmado 6" y "Rechazado 1". |
| 4.8 | Abra el lote. | La tabla muestra el estado de cada certificado y, en Gladys y Edison, su motivo. |
| 4.9 | **Opcional:** como `rquispe`, registre otro lote pequeño (dos personas escritas a mano). Como Director, ábralo y pulse "Observar lote" con un motivo. | "2 certificados fueron observados y volvieron al área." "El lote ya no tiene certificados pendientes." El lote sale de Por revisar. |

---

## 5. HU17: Almacenar el PDF en IPFS (DRA-25)

**Objetivo:** comprobar que el PDF final queda guardado en el almacenamiento privado (IPFS) y que, si el almacenamiento falla, el documento vuelve a Pendiente.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 5.1 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh` y abra en el navegador el enlace "PDF en IPFS" de Lucía. | Se abre el PDF de Lucía **guardado en IPFS**. Es el definitivo: con la fecha de emisión, el QR y la leyenda, sin la marca "MUESTRA". |
| 5.2 | **Con ayuda del equipo:** detenga el almacenamiento con `docker stop e2e-ipfs`. Como Director, firme a Kevin desde su revisión. | "No se firmó ningún documento." "1 documento no se pudo firmar y volvió a Por revisar: … No se pudo guardar el PDF. El documento volvió a Pendiente." |
| 5.3 | **Con ayuda del equipo:** vuelva a encender el almacenamiento con `docker start e2e-ipfs`. | Kevin sigue en Por revisar, revisado. No se registró nada en la blockchain. |

---

## 6. HU18: Sincronizar los estados con la blockchain (DRA-26)

**Objetivo:** comprobar que una firma registrada en la blockchain se refleja aunque el navegador se cierre antes de confirmarla. También, que un documento que quedó a medias vuelve solo a Pendiente.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 6.1 | Como Director, abra Kevin y pulse **Firmar** → "Confirmar". Cuando MetaMask pida confirmar, confírmelo y **cierre de inmediato la pestaña de la plataforma**, antes de ver el resultado. | La firma se envía a la blockchain, pero la plataforma puede no recibir la confirmación. |
| 6.2 | Espere un minuto. Abra de nuevo la plataforma, ingrese como `pmorales` y abra Mis documentos. | Kevin aparece **Firmado**. Si la pestaña alcanzó a confirmar, también está Firmado: el resultado es el mismo. |
| 6.3 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh` con el código de Kevin. | El historial termina en FIRMADO. Si la pestaña se cerró a tiempo, dice "Firma confirmada por la sincronización con la blockchain…". |
| 6.4 | **Opcional, para el final de la sesión:** como `pmorales`, registre un tercer Certificado de Trabajo (por ejemplo, con el expediente `EXP-2026-005393`). Como Director, ábralo y pulse **Firmar** → "Confirmar". Cuando MetaMask pida confirmar, **cierre la pestaña sin confirmar**. | El documento queda en **Procesando firma**, en azul en Mis documentos. Pasados **15 minutos** vuelve solo a Pendiente y reaparece en Por revisar, revisado. |

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 3. Si nota que falta, no es una observación:

- **Observar y rechazar un documento a solicitud de parte, y corregir y reenviar lo observado:** llegan en el Sprint 4 (HU13 a HU15). En el Sprint 3 solo se observan y rechazan certificados de un lote.
- **Pantalla Documentos firmados, búsqueda, historial y auditoría (CID, transacción, bloque):** llegan en el Sprint 4 (HU22 a HU24). Mientras tanto, el equipo los muestra con `./e2e/ver-registro.sh`.
- **Portal público de verificación al que lleva el QR:** llega en el Sprint 5 (HU19 a HU21).
- **Avisos a Mesa de Partes y al área:** llegan en el Sprint 6 (HU26 a HU28).
- **Anulación:** llega con HU29.

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-21 a DRA-26):

- **Si todo se vio como se espera,** deje el comentario `Aprobado` y mueva el ticket a **Listo**.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El ticket queda en "En revisión" y el equipo carga el ajuste para el Sprint 4.
- **Si tiene un cambio de criterio** (por ejemplo, el plazo de 15 minutos o un texto), indíquelo en el comentario aunque apruebe. Se registra como cambio para el siguiente Sprint.

Las decisiones se recogen también en el acta de la [revisión del Sprint 3](revision.md).
