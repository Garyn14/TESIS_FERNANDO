# Guion de pruebas de punta a punta en QA

Este guion comprueba, desde el navegador y el celular, que lo construido y probado en local llegó igual al **ambiente QA en AWS**. Recorre las 30 historias en el orden real del trabajo: el Administrador prepara las cuentas, las áreas registran, el Director revisa y firma, Mesa de Partes atiende y cualquier persona verifica en el portal. Al final hay pruebas propias de QA: el apagado y el encendido.

Los textos esperados son los mismos de los guiones de los Sprints 1 a 6 (`docs/scrum/sprint-N/guion-de-pruebas.md`). Si en QA algo se ve distinto que en local, es una observación.

- **Ticket:** DRA-57
- **Tiempo estimado:** 2 a 3 horas
- **Resultado de cada paso:** marque ☐ OK, ☐ NO OK u ☐ Obs. (OK con observación) en la última columna. En NO OK y Obs., anote lo que vio.

---

## Antes de empezar

### Direcciones de QA

| | Dirección |
|---|---|
| Plataforma interna | https://d1px0ea1324c4y.cloudfront.net |
| Portal de verificación (va en el QR) | https://d3u5jxvc0sbgm7.cloudfront.net |
| Red para MetaMask | RPC `https://d1px0ea1324c4y.cloudfront.net/rpc`, chainId `20260`, moneda `DRA` |

**QA debe estar encendido.** Si al abrir la plataforma aparece "El ambiente de QA está apagado o encendiéndose", ejecute **GitHub → Actions → QA – Encender → Run workflow** (rama `main`) y espere unos 5 minutos.

### Lo que se lee en AWS

En la consola de AWS (región **Ohio, us-east-2**), vaya a **Systems Manager → Parameter Store**. En cada parámetro pulse **Show decrypted value**:

| Parámetro | Para qué |
|---|---|
| `/dra-satipo/qa/PLATAFORMA_ADMIN_CONTRASENA` | Contraseña temporal del usuario `admin` |
| `/dra-satipo/qa-billeteras/ADMINISTRADOR_CLAVE` | Clave privada del Administrador del contrato, para MetaMask |
| `/dra-satipo/qa-billeteras/DIRECTOR_CLAVE` | Clave privada del Director, para MetaMask |
| `/dra-satipo/qa-billeteras/DIRECTOR_DIRECCION` | Dirección de la billetera del Director, para registrarla en la plataforma |

**Las billeteras son solo de prueba y no tienen valor.** No use una billetera propia ni estas claves fuera de QA.

### MetaMask (en la computadora)

MetaMask es la billetera digital del navegador. En la plataforma, el **Administrador del contrato** la usa para darle al Director el permiso de firmar, y el **Director** la usa para firmar y anular documentos. En QA se usan dos billeteras de prueba, ya creadas, cuyas claves están en Parameter Store.

**A. Instalar MetaMask** (si no la tiene)

1. En Chrome, Edge, Brave o Firefox, instale la extensión desde https://metamask.io/download.
2. Al abrirla, elija **Crear una billetera nueva**, defina una contraseña y guarde la frase de recuperación que le muestra. Esa billetera propia **no se usa** en las pruebas: solo sirve para abrir MetaMask.

**B. Importar las dos billeteras de prueba** (una vez cada una)

1. Abra MetaMask y pulse el **nombre de la cuenta**, arriba al centro.
2. Pulse **Agregar cuenta o billetera de hardware** → **Importar cuenta**.
3. Pegue la clave privada de `ADMINISTRADOR_CLAVE` (empieza con `0x`) y pulse **Importar**.
4. Para ponerle nombre: en el menú de la cuenta (⋮), elija **Detalles de la cuenta**, pulse el lápiz junto al nombre y escriba `Administrador (QA)`.
5. Repita los pasos 1 a 4 con `DIRECTOR_CLAVE` y el nombre `Director (QA)`.
6. Compruebe: la dirección de `Director (QA)` (se ve al pulsar el nombre de la cuenta) debe coincidir con `DIRECTOR_DIRECCION` de Parameter Store.

Los nombres de las opciones pueden variar un poco según la versión de MetaMask.

**C. La red de QA**

MetaMask tiene que estar conectada a la blockchain de QA, no a Ethereum. La propia plataforma la propone la primera vez que conecta la billetera (pasos 1.18–1.19): MetaMask muestra **"¿Permitir que este sitio agregue una red?"** con el nombre **Plataforma DRA Satipo**. Pulse **Aprobar** y luego **Cambiar de red**.

Si prefiere agregarla antes, a mano:

1. En MetaMask, abra el selector de redes (arriba a la izquierda) → **Agregar una red personalizada** (o Configuración → Redes → Agregar red → Agregar una red manualmente).
2. Complete los datos y pulse **Guardar**:

   | Campo | Valor |
   |---|---|
   | Nombre de la red | `Plataforma DRA Satipo (QA)` |
   | URL de RPC | `https://d1px0ea1324c4y.cloudfront.net/rpc` |
   | ID de cadena (chainId) | `20260` |
   | Símbolo de la moneda | `DRA` |
   | URL del explorador de bloques | (vacío) |

3. Seleccione esa red.

La red no cobra: el saldo de las billeteras es 0 DRA y el costo de cada operación es cero. Si MetaMask muestra un aviso de saldo insuficiente o de red desconocida, se puede confirmar igual.

### Otros materiales

- **Archivo Excel de prueba:** descárguelo de [beneficiarios-prototipo.xlsx](https://github.com/Garyn14/TESIS_FERNANDO/raw/main/plataforma/e2e/datos/beneficiarios-prototipo.xlsx). Son los 8 participantes del taller del prototipo.
- **Un celular con cámara**, con internet. A diferencia de las pruebas locales, no necesita estar en la misma red Wi-Fi: el portal de QA es público.

### Recomendaciones

- **Siga el guion en orden.** Cada sección usa lo que creó la anterior.
- **QA conserva los datos.** A diferencia de la plataforma local, QA no empieza vacío cada vez. Este guion supone un QA recién creado. Si se repite, use otros expedientes y DNI, o empiece de cero con **QA – Destruir** y **QA – Encender** (con eso las direcciones cambian).
- **MetaMask solo funciona en la ventana normal.** Use la ventana normal para el Administrador y el Director. Use una de incógnito, u otro navegador, para las demás cuentas.
- **QA usa los tiempos de producción:** la sesión expira a los 30 minutos sin uso, la sincronización con la blockchain es cada 30 segundos y una firma a medias vuelve a Pendiente a los 15 minutos.
- **QA se apaga solo a las 00:17 (hora de Lima).** Empiece con tiempo. Si GitHub ejecuta ese apagado tarde, después de las 06:00, no apaga nada: QA no se apaga en horario de trabajo.

### Cuentas del guion

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La de Parameter Store | AdminPropia26 |
| rquispe | Rosa Quispe Huamán | Área encargada – Área de Capacitación | Demo2026 | Propia2026 |
| pmorales | Pedro Morales Ccanto | Área encargada – Área de Administración | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |
| lflores | Luz Flores Ticona | Consulta interna (Mesa de Partes) | Demo2026 | Propia2026 |
| ltorres | Luis Torres Paredes | Consulta interna | Demo2026 | Propia2026 |

Son contraseñas de prueba de QA, las mismas de los guiones del PO.

---

## 1. Administrador: cuentas, áreas, acceso y billetera del Director

Historias: HU01, HU05, HU03, HU04, HU02 y HU06 (Sprint 1).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 1.1 | Abra la plataforma de QA. Ingrese con `admin` y la contraseña de Parameter Store. | Aparece "Cambie su contraseña". Es obligatorio cambiarla. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.2 | Escriba la temporal, luego `AdminPropia26` dos veces, y pulse "Cambiar contraseña". | Entra. El menú muestra Inicio, Usuarios y Billetera del director. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.3 | En **Usuarios**, pulse "Nueva cuenta". Escriba `ab` como usuario, deje vacío el nombre y pulse "Crear cuenta". | No se crea. Se indica que el usuario debe tener de 4 a 30 caracteres y que el nombre completo es obligatorio. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.4 | Elija el rol **Área encargada** sin elegir área y pulse "Crear cuenta". | No se guarda: "Seleccione el área de la persona". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.5 | Elija el área **Área de Capacitación**. | Debajo se muestra "Certificado de Capacitación, Certificado de Reconocimiento". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.6 | Cree las **seis cuentas** de la tabla de arriba (salvo `admin`), cada una con su nombre, rol, área y la temporal `Demo2026`. | Cada una muestra "Se creó la cuenta …" y aparece **Activa** en la lista. Las del Área encargada muestran su área junto al rol. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.7 | Intente crear otra cuenta con el usuario `RQuispe` (con mayúsculas). | No se crea: "El nombre de usuario ya está registrado". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.8 | En la ventana de incógnito, ingrese con `ltorres` / `Demo2026` y cambie la temporal por `Propia2026`. | El menú muestra solo Inicio y Buscar documentos. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.9 | Con la sesión de Luis, escriba la dirección de la plataforma seguida de `#/usuarios`. | "No tiene permiso para ver esta sección". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.10 | Cierre sesión. Ingrese con `ltorres` y una contraseña equivocada tres veces seguidas. | Los dos primeros: "Usuario o contraseña incorrectos". Al tercero se indica que la cuenta quedó bloqueada por 3 intentos fallidos y hasta qué hora. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.11 | Ingrese con `ltorres` / `Propia2026`. | Tampoco entra: mientras está bloqueada no se acepta ni la contraseña correcta. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.12 | Como `admin`, en Usuarios, pulse "Restablecer" en `ltorres` → "Generar" → "Restablecer contraseña". Anote la temporal. | Se muestra la temporal generada. Al pulsar "Listo", la fila ya no indica "Bloqueada hasta". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.13 | En la ventana de incógnito, ingrese con `ltorres` y la temporal anotada. Cámbiela por `Propia2026`. | Le pide cambiarla y luego entra. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.14 | Con la sesión de Luis abierta, como `admin` pulse "Desactivar" en `ltorres` y confirme. Luego, en la ventana de Luis, pulse cualquier opción del menú. | La fila queda **Inactiva**. La sesión de Luis se cierra con el aviso de que la cuenta fue desactivada, y ya no puede ingresar. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.15 | Como `admin`, pulse "Reactivar" en `ltorres` y confirme. | La cuenta vuelve a estar activa. Luis puede ingresar otra vez. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.16 | Entre a **Billetera del director**. Pulse "Registrar billetera" en `cmendoza` y escriba `0x12345`. Luego escriba la dirección del Director con una letra minúscula cambiada a mayúscula. | La primera no se guarda: debe tener 0x seguido de 40 caracteres hexadecimales. La segunda tampoco: la suma de verificación (EIP-55) no coincide. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.17 | Pegue la dirección correcta (`DIRECTOR_DIRECCION`) y guarde. | La fila muestra la dirección y "Sin rol de firmante". También se ven la red y la dirección del contrato. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.18 | En MetaMask elija **Director (QA)**. Pulse "Otorgar rol de firmante" → "Conectar billetera y continuar". | La plataforma indica que esa billetera no es administradora del contrato. No se envía nada a MetaMask. Pulse "Cancelar". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.19 | En MetaMask cambie a **Administrador (QA)**. Pulse otra vez "Otorgar rol de firmante" → "Conectar billetera y continuar". | Si MetaMask no tiene la red, la plataforma propone agregar **Plataforma DRA Satipo** (chainId 20260) con el RPC de QA: acéptela. La ventana muestra la billetera, la red y "Sin costo". | ☐ OK ☐ NO OK ☐ Obs. |
| 1.20 | Pulse "Confirmar en la billetera" y apruebe en MetaMask. | "Rol de firmante otorgado". Al pulsar "Listo", la fila dice **✓ Firmante activo**. | ☐ OK ☐ NO OK ☐ Obs. |
| 1.21 | Vaya a Usuarios y vuelva a Billetera del director. | Sigue "✓ Firmante activo": el estado se lee de la blockchain de QA. | ☐ OK ☐ NO OK ☐ Obs. |

---

## 2. Áreas: registro individual y por lista

Historias: HU07, HU08 y HU09 (Sprint 2).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 2.1 | En la ventana de incógnito, ingrese con `pmorales` / `Demo2026`, cambie la temporal por `Propia2026` y abra **Nuevo documento**. | Ve sus dos tipos, Certificado de Prácticas y Certificado de Trabajo, con la etiqueta "A solicitud de parte". | ☐ OK ☐ NO OK ☐ Obs. |
| 2.2 | Pulse **Certificado de Trabajo** y, sin completar nada, "Continuar a vista previa". | No avanza: cada campo vacío se marca con su mensaje. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.3 | Escriba DNI `4582936` (7 dígitos), expediente `2026-5391` y una fecha de fin anterior a la de inicio. Pulse "Continuar a vista previa". | "El DNI debe tener 8 dígitos", "Use el formato EXP-AAAA-NNNNNN…" y "La fecha de fin no puede ser anterior a la de inicio". | ☐ OK ☐ NO OK ☐ Obs. |
| 2.4 | Complete: expediente `EXP-2026-005391`, DNI `45829364`, nombres `Lucía`, apellidos `Paredes Quinto`, cargo `asistente administrativa`, del 02/01/2025 al 30/09/2026. Pulse "Continuar a vista previa". | Vista previa del certificado con "Otorgado a LUCÍA PAREDES QUINTO", el texto del cargo y las fechas, la firma del Ing. Carlos Mendoza Rivera y la marca "VISTA PREVIA". | ☐ OK ☐ NO OK ☐ Obs. |
| 2.5 | Pulse "Enviar a revisión" → "Enviar". | "✓ Documento enviado a revisión", con el código DRA-2026-…. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.6 | Registre igual, con el mismo cargo y fechas, otros tres **Certificados de Trabajo**:<ul><li>Kevin Ramos Ccanto, DNI `46385127`, `EXP-2026-005392`;</li><li>Martha Rojas Inga, DNI `44200001`, `EXP-2026-005401`;</li><li>Nilo Huamán Soto, DNI `44200002`, `EXP-2026-005402`.</li></ul> | Los cuatro aparecen en **Mis documentos** como **Pendiente**. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.7 | Intente registrar un **Certificado de Prácticas** con el expediente `EXP-2026-005391`. | No se envía: "El número de expediente ya está registrado en otro documento". | ☐ OK ☐ NO OK ☐ Obs. |
| 2.8 | Cierre sesión. Ingrese con `rquispe`, cambie la temporal por `Propia2026` y abra **Nuevo documento** → **Certificado de Capacitación**. | "Emisión por lista", con "Origen: De oficio" y el área organizadora ya completa. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.9 | Complete el taller: `Manejo integrado de plagas en café`, del 14/09/2026 al 16/09/2026, `24` horas, `Local comunal de Río Negro, Satipo`. Pulse "Continuar". | Pasa a Beneficiarios, sin beneficiarios todavía. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.10 | Pulse "Descargar plantilla Excel". | Se descarga `plantilla-beneficiarios.xlsx` con las columnas Nombres, Apellidos y DNI. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.11 | Pulse "Importar desde Excel" y elija `beneficiarios-prototipo.xlsx`. | "Se importaron 8 beneficiarios desde Excel". La fila 5 (Wilber) está en rojo: "El DNI debe tener 8 dígitos". | ☐ OK ☐ NO OK ☐ Obs. |
| 2.12 | Corrija el DNI de la fila 5 a `44198236`. Pulse "Continuar a vista previa". | Certificado de ejemplo de **JUAN CCORI PARI** con el texto del taller, y el resumen del lote con 8 certificados. | ☐ OK ☐ NO OK ☐ Obs. |
| 2.13 | Pulse "Enviar a revisión" → "Enviar". | "✓ ¡Listo! Se enviaron 8 certificados a revisión (Lote 2026-001)". En Mis documentos, el lote ocupa una fila, Pendiente. | ☐ OK ☐ NO OK ☐ Obs. |

---

## 3. Director: avisos, revisión, PDF final y firma

Historias: HU26, HU10, HU16, HU11 y HU17 (Sprints 3 y 6).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 3.1 | En la ventana normal, ingrese con `cmendoza` y cambie la temporal por `Propia2026`. Mire el encabezado. | Junto a su nombre hay una **campana** con un número rojo de avisos sin leer. | ☐ OK ☐ NO OK ☐ Obs. |
| 3.2 | Pulse la campana. | Avisos del más reciente al más antiguo: "Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (8 certificados)", **un solo aviso** para el lote, y "Nuevo documento pendiente: Certificado de Trabajo – …" por cada documento. | ☐ OK ☐ NO OK ☐ Obs. |
| 3.3 | Pulse "Marcar todos como leídos" y cierre el panel. Abra **Por revisar**. | La campana queda sin número. Por revisar muestra, del más antiguo al más reciente, a Lucía, Kevin, Martha, Nilo y "▤ Lote 2026-001 · … · 8 certificados", todos "Sin revisar". | ☐ OK ☐ NO OK ☐ Obs. |
| 3.4 | Pulse **Kevin Ramos Ccanto**. | "Revisión – Certificado de Trabajo", con el expediente, el área, quién lo envió y el certificado con la marca VISTA PREVIA. Abajo: "✓ Quedó registrado como revisado". | ☐ OK ☐ NO OK ☐ Obs. |
| 3.5 | Pulse "Ver muestra del PDF final ↗". | PDF A4 horizontal con "Fecha de emisión: [hoy]", el QR, el código, la firma con "Firmado digitalmente mediante blockchain", la leyenda "Verifique la autenticidad de este documento en **d3u5jxvc0sbgm7.cloudfront.net** con el código …" y la marca "MUESTRA – SIN VALOR". | ☐ OK ☐ NO OK ☐ Obs. |
| 3.6 | Lea el QR de la muestra con la cámara del celular. | El enlace es `https://d3u5jxvc0sbgm7.cloudfront.net/verificar/…`: **el portal de QA**, con HTTPS. Todavía no está firmado, así que el portal no lo da por válido. | ☐ OK ☐ NO OK ☐ Obs. |
| 3.7 | En MetaMask elija **Administrador (QA)**. En la revisión de Kevin pulse **Firmar**. | "Firmar con su billetera" avisa que la billetera conectada **no es la registrada** y no deja continuar. | ☐ OK ☐ NO OK ☐ Obs. |
| 3.8 | En MetaMask cambie a **Director (QA)** y pulse "Intentar nuevamente". | "Cuenta: Ing. Carlos Mendoza Rivera (0x…)", "Acción: Firmar 1 documento", la red y "Costo de la operación: Sin costo". | ☐ OK ☐ NO OK ☐ Obs. |
| 3.9 | Pulse "Confirmar" y confirme en MetaMask. | Pasa por "Verificando su billetera", "Preparando los documentos", "Registrando la firma" y "Confirmando el registro". Termina en "¡Listo! Se firmó 1 documento." | ☐ OK ☐ NO OK ☐ Obs. |
| 3.10 | Vuelva a Por revisar. Abra **Nilo**, vuelva, marque su casilla y pulse "Firmar seleccionados" → "Confirmar". En MetaMask, **rechace** la operación. | "No se firmó ningún documento." Nilo vuelve a Por revisar: "Firma cancelada en la billetera." | ☐ OK ☐ NO OK ☐ Obs. |

---

## 4. Director: observar, rechazar y lote

Historias: HU13, HU14 y HU12 (Sprints 3 y 4).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 4.1 | Abra la revisión de **Lucía** y pulse **Observar**. | "Observar documento" con el campo Motivo. "Confirmar" está deshabilitado mientras el motivo esté vacío. | ☐ OK ☐ NO OK ☐ Obs. |
| 4.2 | Escriba `El cargo no coincide con el contrato de trabajo` y confirme. | "El documento fue observado y volvió al área.", con el motivo. | ☐ OK ☐ NO OK ☐ Obs. |
| 4.3 | Abra **Martha** y pulse **Rechazar**. | "Rechazar documento", con el aviso "El rechazo es definitivo. El documento no podrá reenviarse." | ☐ OK ☐ NO OK ☐ Obs. |
| 4.4 | Escriba `La persona no laboró en la agencia en las fechas indicadas.` y confirme. | "El documento fue rechazado.", con el motivo y sin botones. | ☐ OK ☐ NO OK ☐ Obs. |
| 4.5 | Abra el **Lote 2026-001**. Recorra con "Siguiente ›" y pulse un nombre de la relación. | "Revisión de lote – Lote 2026-001", con los datos del evento y "Certificado 1 de 8". | ☐ OK ☐ NO OK ☐ Obs. |
| 4.6 | Marque a **Gladys Sanchez Ñaupari**, pulse "Observar seleccionados" con el motivo `El apellido no coincide con el DNI` y confirme. | "1 certificado fue observado y volvió al área." Gladys aparece **Observado**. | ☐ OK ☐ NO OK ☐ Obs. |
| 4.7 | Marque a **Edison Shimpukat Kinchokre**, pulse "Rechazar seleccionados" con el motivo `No asistió al taller` y confirme. | "1 certificado fue rechazado." Edison aparece **Rechazado**. | ☐ OK ☐ NO OK ☐ Obs. |
| 4.8 | Pulse **Firmar lote** → "Confirmar" y confirme en MetaMask. | "Firmar 6 certificados". Al terminar: "¡Listo! Se firmaron 6 certificados.", "1 certificado fue observado y devuelto al área." y "1 certificado fue rechazado." | ☐ OK ☐ NO OK ☐ Obs. |

---

## 5. Áreas: corregir y reenviar; firma que se confirma sola

Historias: HU15 y HU18 (Sprints 3 y 4), y HU27 (avisos al área).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 5.1 | En la ventana de incógnito, ingrese con `pmorales` y abra la campana. | Avisos del **Área de Administración**: "Firmado: …" de Kevin, "Observado: … Lucía…" con su motivo y "Rechazado: … Martha Rojas Inga. Motivo: …". | ☐ OK ☐ NO OK ☐ Obs. |
| 5.2 | Abra **Mis documentos**. | Kevin **Firmado** (verde), Lucía **Observado** (naranja), Martha **Rechazado** (rojo) y Nilo Pendiente. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.3 | Abra el detalle de Lucía y pulse **Corregir y reenviar**. | El formulario precargado, con el motivo de la observación arriba. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.4 | Cambie el cargo a `secretaria` y los apellidos a `Paredes Quintana`. Pulse "Continuar a vista previa" → "Reenviar a revisión" y confirme. | "✓ Documento corregido y reenviado a revisión", **con el mismo código**. Vuelve a Pendiente. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.5 | Abra el detalle de Martha. | "El Director lo rechazó. El rechazo es definitivo." y el motivo. No hay opción para corregirlo. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.6 | Cierre sesión e ingrese con `rquispe`. Abra la campana y luego el lote en Mis documentos. | Avisos del **Área de Capacitación** sobre el lote: firmados, observado y rechazado, con su motivo. El lote muestra "Firmado 6", "Observado 1" y "Rechazado 1". | ☐ OK ☐ NO OK ☐ Obs. |
| 5.7 | En la fila de Gladys pulse **Corregir**. Cambie los apellidos a `Sánchez Ñaupari` y pulse "Reenviar a revisión". | Se reenvía y Gladys vuelve a **Pendiente** en el lote. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.8 | Vuelva a la ventana del Director (`cmendoza`) y abra **Por revisar**. | Lucía Paredes Quintana con la etiqueta **Corregido** y "Sin revisar". El Lote 2026-001 también con **Corregido**. Al abrir Lucía se ve el texto nuevo. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.9 | Firme a **Lucía** y luego el **lote** (Gladys) con MetaMask. | "¡Listo! Se firmó 1 documento." y "¡Listo! Se firmó 1 certificado." | ☐ OK ☐ NO OK ☐ Obs. |
| 5.10 | Abra **Nilo**, pulse **Firmar** → "Confirmar". Cuando MetaMask pida confirmar, confírmelo y **cierre de inmediato la pestaña de la plataforma**. | La firma se envía a la blockchain aunque la plataforma no vea el resultado. | ☐ OK ☐ NO OK ☐ Obs. |
| 5.11 | Espere **un minuto**, abra otra vez la plataforma e ingrese como `pmorales`. Abra Mis documentos. | Nilo aparece **Firmado**: la sincronización con la blockchain lo confirmó. | ☐ OK ☐ NO OK ☐ Obs. |

---

## 6. Director: anular y reemitir

Historias: HU29 y HU30 (Sprint 4).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 6.1 | Como `cmendoza`, abra **Documentos firmados**. | Los firmados, del más reciente al más antiguo, con código o lote, tipo, beneficiario y DNI, área, fecha de firma y estado. El lote en una fila. | ☐ OK ☐ NO OK ☐ Obs. |
| 6.2 | Escriba `nilo` en "Buscar por nombre o código". En la fila de Nilo pulse **Anular**. | Solo queda Nilo. Se abre "Anular documento", con el aviso "La anulación es definitiva…". | ☐ OK ☐ NO OK ☐ Obs. |
| 6.3 | Escriba `El certificado se emitió con el cargo equivocado` → "Confirmar" → "Confirmar" en la ventana de la billetera, y confirme en MetaMask. | "Documento anulado. [código] – Nilo Huamán Soto. Ya no es válido." Nilo aparece **Anulado** (gris y tachado). | ☐ OK ☐ NO OK ☐ Obs. |
| 6.4 | Despliegue el lote y, en un certificado (por ejemplo, Nelly), pulse Anular con un motivo. En MetaMask **rechace** la operación. | "Anulación cancelada en la billetera. El documento sigue firmado." | ☐ OK ☐ NO OK ☐ Obs. |
| 6.5 | En la ventana de incógnito, como `pmorales`, abra el detalle de **Kevin** (Firmado) y pulse **↻ Reemitir con corrección**. | Formulario precargado, con el aviso de que el original se anulará al firmar la reemisión. El expediente no se puede cambiar. Aparece el campo **Motivo de la reemisión**. | ☐ OK ☐ NO OK ☐ Obs. |
| 6.6 | Pulse "Continuar a vista previa" sin cambiar nada. Luego escriba el motivo `El cargo correcto es secretaria ejecutiva` y pulse otra vez. | Primero "Ingrese el motivo de la reemisión." y después "Corrija al menos un dato del documento." | ☐ OK ☐ NO OK ☐ Obs. |
| 6.7 | Cambie el cargo a `secretaria ejecutiva` → "Continuar a vista previa" → "Enviar a revisión" → "Enviar". | "✓ Reemisión enviada a revisión", con **un código nuevo**. El original sigue Firmado, con "Reemisión en revisión". | ☐ OK ☐ NO OK ☐ Obs. |
| 6.8 | Como Director, abra Por revisar y la revisión de Kevin. | Etiqueta **Reemisión**. Arriba: "↻ Este documento reemplaza a [código antiguo]", el cambio ("Cargo: asistente administrativa → secretaria ejecutiva") y el motivo. | ☐ OK ☐ NO OK ☐ Obs. |
| 6.9 | Pulse **Firmar** → "Confirmar" y confirme en MetaMask **una sola vez**. | "¡Listo! Se firmó 1 documento." | ☐ OK ☐ NO OK ☐ Obs. |
| 6.10 | Como `pmorales`, abra el detalle del **original** de Kevin. | **Anulado**: "Se anuló al firmarse su reemisión" y "Reemplazado por [código nuevo]", con enlace a la reemisión **Firmada**. | ☐ OK ☐ NO OK ☐ Obs. |

---

## 7. Mesa de Partes: buscar, ficha, auditoría, entrega y avisos

Historias: HU22, HU23, HU24, HU25 y HU28 (Sprint 6).

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 7.1 | Ingrese con `lflores`, cambie la temporal por `Propia2026` y abra la campana. | Avisos de **Mesa de Partes**: "Listo para entregar: …" de cada firmado (con su expediente) y "Rechazado: … Martha Rojas Inga (expediente EXP-2026-005401). Motivo: …". | ☐ OK ☐ NO OK ☐ Obs. |
| 7.2 | Abra **Buscar documentos**. | Los documentos de las dos áreas, cada uno con su estado y color. El lote ocupa una fila. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.3 | Escriba `huaman` (sin tilde). Luego `soto nilo`. | Primero, Nilo Huamán Soto y los del lote que coinciden. Después, solo Nilo. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.4 | Busque por el DNI `45829364`, por el expediente `005391` y por los seis caracteres finales del código de la reemisión de Kevin, en minúsculas. | Cada búsqueda encuentra su documento. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.5 | Borre el texto y pruebe los filtros **Firmados**, **Rechazados** y **Listos para entregar**. | Cada filtro muestra solo lo que corresponde. Martha aparece en Rechazados. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.6 | Abra la ficha de **Lucía**. | Código, "Firmado", "Firmado y registrado en la blockchain. Se puede entregar al ciudadano.", las fechas y los datos. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.7 | Baje al **Historial** y pulse "▸ Detalle técnico de auditoría". | Historial con cada evento, su fecha y su responsable: registrado, observado, corregido, revisado, PDF guardado en IPFS y firmado. El detalle técnico estaba plegado y muestra el SHA-256, el **CID de IPFS**, la **transacción y el bloque** en la blockchain de QA, la billetera firmante y el contrato, cada uno con "Copiar". | ☐ OK ☐ NO OK ☐ Obs. |
| 7.8 | Pulse **Ver documento**. | Se abre el certificado firmado en otra pestaña, con su QR. **Déjelo abierto para la sección 8.** | ☐ OK ☐ NO OK ☐ Obs. |
| 7.9 | Pulse **Descargar PDF**. Luego **Imprimir** y cancele el diálogo. | Se guarda `DRA-2026-….pdf`. El historial suma "PDF descargado por Luz Flores Ticona (Consulta interna)" e "Impreso", y el botón cambia a **Imprimir duplicado**. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.10 | Abra la ficha de **Martha**. | "El Director rechazó el documento. Es definitivo…", con el motivo. Sin botones de entrega. | ☐ OK ☐ NO OK ☐ Obs. |
| 7.11 | Abra también, en otras pestañas, el documento del **original de Kevin** (anulado) y el de **Nilo** (anulado), con "Ver documento" desde su ficha. | Se abren sus PDF, para escanearlos en la sección 8. | ☐ OK ☐ NO OK ☐ Obs. |

---

## 8. Portal público: verificar con el celular

Historias: HU19, HU20 y HU21 (Sprint 5). Use **el celular con datos móviles o cualquier Wi-Fi**: el portal de QA es público.

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 8.1 | Escanee con el celular el QR del PDF de **Lucía** y abra el enlace. | Se abre `https://d3u5jxvc0sbgm7.cloudfront.net/verificar/…`, el portal "Agencia Agraria Satipo – DRA Junín · Verificación de documentos". **No pide usuario ni contraseña.** | ☐ OK ☐ NO OK ☐ Obs. |
| 8.2 | Mire el resultado. | En menos de dos segundos: **Documento válido**, con el tipo, el titular (Lucía Paredes Quintana), la fecha de emisión con el mes en letras y "Vigente". No muestra el DNI. | ☐ OK ☐ NO OK ☐ Obs. |
| 8.3 | Baje en la página. Pulse "Descargar PDF" y luego "Abrir el documento". | En "Documento completo" se ve el certificado firmado. El celular guarda o abre el mismo PDF. | ☐ OK ☐ NO OK ☐ Obs. |
| 8.4 | Escanee el QR del PDF de **Nilo**. | **Documento anulado**: "Este documento fue anulado y ya no es válido.", con la fecha de anulación. No se muestra el documento. | ☐ OK ☐ NO OK ☐ Obs. |
| 8.5 | Escanee el QR del **original de Kevin**. | **Documento anulado**, con "Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo." No aparece el código de la versión corregida. | ☐ OK ☐ NO OK ☐ Obs. |
| 8.6 | En el celular, abra el portal sin `/verificar/…`. Escriba `DRA-26-123` y pulse "Verificar". | La portada "Verifique un documento". Junto al campo: "Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA." | ☐ OK ☐ NO OK ☐ Obs. |
| 8.7 | Escriba el código de **Lucía** en minúsculas y con espacios en lugar de guiones, y pulse "Verificar". | Se corrige a `DRA-2026-…` y aparece **Documento válido** con los datos básicos. No se muestra el documento: "Para ver el documento completo, escanee su código QR." | ☐ OK ☐ NO OK ☐ Obs. |
| 8.8 | Pulse "Verificar" rápido hasta 12 veces. | Desde la consulta 11 en el mismo minuto: "Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente." Pasado un minuto, vuelve a funcionar. | ☐ OK ☐ NO OK ☐ Obs. |
| 8.9 | En la computadora, abra la dirección del portal seguida de `/verificar/` y letras al azar. | **Documento no válido**: "No encontramos un documento válido con estos datos." | ☐ OK ☐ NO OK ☐ Obs. |

---

## 9. Propias de QA: apagar, aviso y encender

Comprueban la infraestructura de AWS (DRA-52, DRA-54 y DRA-56). Hágalas al final.

| Paso | Qué hacer | Qué se espera | Resultado |
|---|---|---|---|
| 9.1 | Anote el código de Lucía. En GitHub, ejecute **Actions → QA – Apagar → Run workflow** y espere a que termine (unos 5 a 8 minutos). | La ejecución termina en verde. El resumen dice "Servidor … apagado. Los datos se conservan." y "CloudFront muestra el aviso de QA apagado." | ☐ OK ☐ NO OK ☐ Obs. |
| 9.2 | Abra la plataforma de QA. | La pantalla de inicio de sesión carga y muestra "El ambiente de QA está apagado o encendiéndose. Intente nuevamente en unos minutos." | ☐ OK ☐ NO OK ☐ Obs. |
| 9.3 | En el celular, vuelva a escanear el QR de Lucía. | El portal carga y muestra el mismo aviso de QA apagado, no un error técnico. | ☐ OK ☐ NO OK ☐ Obs. |
| 9.4 | Ejecute **Actions → QA – Encender → Run workflow** y espere a que termine (unos 5 a 10 minutos). | Termina en verde. El resumen muestra **las mismas direcciones** de siempre. | ☐ OK ☐ NO OK ☐ Obs. |
| 9.5 | Ingrese como `pmorales` (`Propia2026`) y abra Mis documentos. | **Los datos se conservaron:** las cuentas, las contraseñas propias, los documentos y sus estados están como los dejó. | ☐ OK ☐ NO OK ☐ Obs. |
| 9.6 | Escanee otra vez el QR de Lucía. | **Documento válido**, con el documento completo: el PDF en IPFS y la firma en la blockchain siguen ahí después de apagar y encender. | ☐ OK ☐ NO OK ☐ Obs. |
| 9.7 | Como `cmendoza`, entre a la revisión de cualquier pendiente o a Documentos firmados. | Todo responde. La billetera del Director sigue con "✓ Firmante activo" en la pantalla del Administrador. | ☐ OK ☐ NO OK ☐ Obs. |

---

## Lo que este guion no repite

Ya se comprobó en local y en las pruebas automáticas contra el mismo servidor de AWS (DRA-54). En QA no conviene repetirlo, porque apaga piezas del servidor o tarda mucho:

- **IPFS caído durante una firma** (HU17) **o durante una verificación** (HU21): el documento vuelve a Pendiente, o el portal dice "No se pudo verificar…".
- **Firma a medias que vuelve sola a Pendiente** (HU18): tarda 15 minutos en QA.
- **Expiración de la sesión por inactividad** (HU03): tarda 30 minutos en QA. Si quiere, déjela correr en paralelo con una ventana sin usar.

## Resumen de resultados

| Sección | Historias | OK | NO OK | Obs. |
|---|---|---|---|---|
| 1. Administrador | HU01–HU06 | | | |
| 2. Áreas: registro | HU07–HU09 | | | |
| 3. Director: avisos, revisión y firma | HU10, HU11, HU16, HU17, HU26 | | | |
| 4. Director: observar, rechazar y lote | HU12–HU14 | | | |
| 5. Corregir, reenviar y sincronizar | HU15, HU18, HU27 | | | |
| 6. Anular y reemitir | HU29, HU30 | | | |
| 7. Mesa de Partes | HU22–HU25, HU28 | | | |
| 8. Portal público | HU19–HU21 | | | |
| 9. Apagar y encender QA | DRA-52, DRA-54, DRA-56 | | | |

**Cada NO OK u observación** se registra como un ticket nuevo, enlazado a su historia, con el número de paso, lo que vio y lo que esperaba. Pásele la lista al equipo.
