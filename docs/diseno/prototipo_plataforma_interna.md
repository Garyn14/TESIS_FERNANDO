# Prototipo de la plataforma interna – Documentación completa

**Plataforma de Certificados y Constancias – Agencia Agraria Satipo, DRA Junín**

Versión: 27 de octubre de 2026
Herramienta: Figma Make (aplicación React generada por IA)
Archivo de Figma: "Agencia Agraria Satipo – Plataforma interna (prototipo)"

---

## Cómo leer este documento

Este documento describe, de forma autosuficiente, el prototipo navegable de la **plataforma interna**. Está pensado para que una persona o un sistema sin contexto previo pueda entender, reconstruir o extender el prototipo.

- La **sección 1** explica el propósito y el contexto.
- La **sección 2** describe la guía visual.
- La **sección 3** describe los roles y usuarios.
- La **sección 4** describe el comportamiento global (estado, notificaciones, contadores).
- La **sección 5** describe los datos iniciales.
- La **sección 6** describe cada pantalla.
- La **sección 7** describe cada flujo paso a paso.
- La **sección 8** reúne todos los mensajes del sistema.
- La **sección 9** lista lo que está fuera del alcance.
- La **sección 10** da las indicaciones para la demostración.

Cuando un dato fue generado por el propio prototipo y no se conoce con exactitud, se indica como **(ver prototipo)**.

---

## 1. Propósito y contexto

### 1.1 Qué es

Es un prototipo navegable de una plataforma web de uso interno para la **Agencia Agraria Satipo**, agencia de la **Dirección Regional de Agricultura (DRA) Junín**, en Perú. La plataforma permite:

1. **Registrar** solicitudes de certificados y constancias.
2. **Revisar y firmar** los documentos por parte del Director, sin que tenga que estar en la sede.
3. **Buscar, consultar el historial e imprimir** los documentos firmados.
4. **Observar, rechazar, anular y reemitir** documentos.

En el sistema real, cada documento firmado se registra en una **blockchain** (Hyperledger Besu) y su PDF se almacena en una **red IPFS privada**. En el prototipo esto **se simula**: no hay blockchain ni almacenamiento real.

### 1.2 Para qué se construyó

Para una **reunión de validación con el personal de la Agencia Agraria Satipo**. El objetivo es que el negocio vea los flujos funcionando como un sistema real y confirme o corrija los requisitos.

### 1.3 Qué no incluye

El **portal público de verificación** (donde un tercero verifica un documento con su código QR) es otro proyecto, aún no construido. Ver la sección 9.

### 1.4 Documentos del sistema

La agencia emite cinco tipos de documento:

| Documento | Origen | Cómo se emite |
|---|---|---|
| Constancia de Productor Activo | A solicitud de parte | Individual, con número de expediente |
| Certificado de Prácticas | A solicitud de parte | Individual, con número de expediente |
| Certificado de Trabajo | A solicitud de parte | Individual, con número de expediente |
| Certificado de Reconocimiento | De oficio | Por lista (lote) |
| Certificado de Capacitación | De oficio | Por lista (lote) |

En el prototipo, el formulario completo existe solo para el **Certificado de Capacitación** (emisión por lista). Los documentos de los demás tipos aparecen como datos ya cargados.

---

## 2. Guía visual

### 2.1 Principios

- Sistema **institucional, profesional y sobrio**, pero cálido y agradable. No debe parecer una aplicación de criptomonedas.
- El **estado de cada documento siempre está visible**.
- Se usa **lenguaje cotidiano**. Las palabras técnicas (blockchain, hash, CID, transacción, bloque) **solo aparecen** en la sección "Detalle técnico de auditoría".
- Las **acciones irreversibles** (Rechazar, Anular) se distinguen con color rojo y piden confirmación.
- **Ningún significado depende solo del color**: cada estado lleva texto e ícono.

### 2.2 Paleta de colores

Basada en la identidad visual de la DRA Junín (verde y dorado del logo).

| Uso | Color | Código |
|---|---|---|
| Primario (menú lateral, botones principales) | Verde institucional | `#1B5E20` |
| Primario suave (hover, enlaces, opción activa del menú) | Verde medio | `#2E7D32` |
| Acento (solo decorativo: barra de la opción activa del menú) | Dorado | `#E8B500` |
| Fondo general | Crema | `#FAF7F0` |
| Tarjetas, tablas, formularios | Blanco | `#FFFFFF` |
| Texto | Verde casi negro | `#1F2A22` |
| Bordes y separadores | Beige claro | `#E5E1D8` |

Regla: el dorado **nunca** se usa para texto, porque no tiene contraste suficiente sobre fondos claros.

### 2.3 Etiquetas de estado

Fondo claro, texto oscuro del mismo tono e ícono. Siempre con texto.

| Estado | Color | Ícono |
|---|---|---|
| Pendiente | Ámbar | Reloj |
| Observado | Naranja | Signo de exclamación |
| Rechazado | Rojo | Equis |
| Procesando firma | Azul | Indicador de carga |
| Firmado | Verde | Visto |
| Anulado | Gris | Texto tachado |

Etiquetas adicionales (no son estados):
- **"Corregido"**: documento o lote reenviado tras una observación.
- **"Reemisión"**: documento que reemplaza a otro.
- **"Revisado" / "Sin revisar"**: marca de revisión en la bandeja del Director.

### 2.4 Tipografía

- Fuente: **Inter**.
- Texto de lectura: **16 px como mínimo** (criterio de accesibilidad de gob.pe).
- Títulos de pantalla: 24 px.
- Excepción: los contadores (insignias numéricas de la campana y del menú) pueden ser menores.
- Valores técnicos de auditoría: tipografía monoespaciada.

### 2.5 Forma y componentes

- Bordes redondeados de 8 a 12 px, espaciado generoso, sombras sutiles, íconos de línea.
- **Botones:**
  - Primario: verde sólido, texto blanco.
  - Secundario: borde verde, fondo blanco.
  - Advertencia: rojo (Rechazar, Anular).
- **Ventanas modales** para motivos y confirmaciones.
- **Avisos temporales** (toasts) para confirmar acciones.
- **Indicador de pasos** en formularios y en el progreso de la firma.
- **Estados vacíos** con una ilustración sencilla y un mensaje amable.
- Diseño de escritorio de **1440 px** de ancho.

### 2.6 Logo

Logo circular de la DRA Junín (verde con borde dorado y las letras "DRA"). Se usa en el login y en el menú lateral.

---

## 3. Roles y usuarios

El prototipo tiene **tres roles**. Cada usuario tiene **un solo rol**. El rol Administrador existe en el sistema real, pero **no está en el prototipo**.

### 3.1 Credenciales de demostración

| Usuario | Contraseña | Nombre | Rol mostrado en el encabezado |
|---|---|---|---|
| `rquispe` | `Demo2026` | Rosa Quispe Huamán | Área encargada – Área de Capacitación |
| `cmendoza` | `Demo2026` | Ing. Carlos Mendoza Rivera | Director de la Agencia Agraria Satipo |
| `ltorres` | `Demo2026` | Luis Torres Paredes | Consulta interna – Mesa de Partes |

Cualquier otra combinación muestra el error "Usuario o contraseña incorrectos".

Todos los nombres son **ficticios**. No se usan nombres de personas reales.

### 3.2 Qué hace cada rol

| Rol | Representa a | Qué puede hacer |
|---|---|---|
| **Área encargada** (Rosa) | Personal de un área que emite documentos | Registrar emisiones por lista, ver los documentos de su área, corregir observados, reemitir firmados. Ve el detalle de un documento en solo lectura, sin sección técnica ni impresión |
| **Director** (Carlos) | Director de la agencia, único firmante | Revisar documentos y lotes, firmar, observar, rechazar y anular |
| **Consulta interna** (Luis) | Personal de Mesa de Partes | Buscar documentos, ver su historial y el detalle técnico de auditoría, imprimir y emitir duplicados |

### 3.3 Menú lateral de cada rol

| Rol | Opciones del menú |
|---|---|
| Área encargada | Inicio · Mis documentos · Nuevo documento |
| Director | Inicio · Por revisar (con contador) · Documentos firmados |
| Consulta interna | Inicio · Buscar documentos |

---

## 4. Comportamiento global

### 4.1 Estado compartido entre roles

Todos los datos (documentos, lotes, estados, historiales, notificaciones y contadores) viven en un **estado único compartido** por los tres roles.

- Un cambio hecho por un rol se ve al entrar con otro rol. Ejemplo: si el Director firma el Lote 2026-007, al cerrar sesión y entrar como Rosa, el lote aparece como Firmado.
- El estado se guarda en **sessionStorage**:
  - **Sobrevive** al cierre de sesión y a la recarga de la página.
  - **Se reinicia** al cerrar la pestaña o al abrir el prototipo en una pestaña nueva.
- Cada vez que Figma Make modifica el prototipo, la vista previa puede cambiar de dirección y el estado vuelve al inicio.

### 4.2 Estados del documento

```
Pendiente ──observar──► Observado ──corregir y reenviar──► Pendiente
Pendiente ──rechazar──► Rechazado (final)
Pendiente ──firmar──► Procesando firma ──► Firmado
                                   └──falla──► vuelve a Por revisar (Revisado)
Firmado ──anular──► Anulado (final)
Firmado ──reemisión firmada──► Anulado (el original)
```

### 4.3 Notificaciones

- Campana en el encabezado con un contador de avisos no leídos.
- Al pulsarla, se despliega un panel con los avisos. Cada uno muestra ícono, texto y tiempo ("hace 10 min").
- Los no leídos tienen un punto verde.
- "Marcar todas como leídas" quita los puntos y el contador.
- **Cada aviso abre** el documento o lote al que se refiere.
- Íconos: naranja para observaciones y errores, equis roja para rechazos, visto verde para firmas.

### 4.4 Tarjetas del inicio (contadores)

Las cifras se **calculan a partir del estado actual**, con un criterio mixto:

- Lo **pendiente** cuenta **envíos**: un lote cuenta como 1.
- Lo **firmado** cuenta **certificados**: un lote cuenta como su número de certificados.

Debajo de cada cifra hay una línea que indica la unidad (por ejemplo, "envíos en revisión" o "certificados emitidos").

| Rol | Tarjeta | Valor inicial | Qué cuenta |
|---|---|---|---|
| Área encargada | Pendientes de firma | 3 | Envíos pendientes |
| Área encargada | Observados (destacada en naranja) | 1 | Envíos observados |
| Área encargada | Firmados este mes | 12 | Certificados firmados |
| Director | Por revisar (destacada en ámbar, con botón "Revisar ahora") | 5 | Envíos en la bandeja |
| Director | Firmados esta semana | 8 | Certificados firmados |
| Director | Observados esta semana | 1 | Envíos observados |
| Consulta interna | Listos para entregar (destacada en verde) | 4 | Envíos firmados aún no impresos |
| Consulta interna | Impresos esta semana | 9 | Eventos de impresión |
| Consulta interna | Duplicados emitidos (ícono gris) | 1 | Reimpresiones |

Ejemplo: al firmar el Lote 2026-007 (8 certificados), Rosa pasa de 3 a 2 pendientes y de 12 a 20 firmados; el Director pasa de 5 a 4 por revisar y de 8 a 16 firmados; Luis pasa de 4 a 5 listos para entregar.

### 4.5 Impresión (no hay estado "Entregado")

- El sistema **no tiene** un estado "Entregado".
- "Listos para entregar" = documentos firmados que **aún no se imprimieron**.
- Al imprimir, el documento sale de esa lista y su historial registra "Impreso por Luis Torres Paredes" con fecha y hora.
- Una impresión posterior se registra como "Duplicado impreso por…" y suma a "Duplicados emitidos".

### 4.6 Simulaciones

| Qué se simula | Cómo |
|---|---|
| Importación desde Excel | El botón carga 8 beneficiarios fijos |
| Descarga de plantilla y de PDF | Solo muestra un aviso |
| Impresión | Solo muestra un aviso y registra el evento |
| Billetera MetaMask | Ventana modal de imitación, sin el logo de la marca |
| Registro en blockchain | Progreso de pasos de ~1 segundo cada uno |
| Falla de firma | El Certificado de Trabajo de Lucía Paredes Quinto falla la primera vez |
| Código QR | Gráfico ilustrativo |

---

## 5. Datos iniciales

### 5.1 Formato de códigos

- Código de documento: `DRA-2026-XXXXXX`, con 6 caracteres en mayúsculas, **sin** 0, O, 1, I ni L.
- Lote: `Lote 2026-NNN`.
- Expediente (solo documentos a solicitud de parte): `EXP-2026-NNNNNN`.

### 5.2 Áreas

| Área | Quién envía |
|---|---|
| Área de Capacitación | Rosa Quispe Huamán |
| Área de Desarrollo Agrario | Marco Salazar Vela |
| Área de Administración | Silvia Poma Torres |

Rosa (Área de Capacitación) tiene asignados el **Certificado de Capacitación** y el **Certificado de Reconocimiento**.

### 5.3 Lote 2026-007 (protagonista de la demo)

- Tipo: Certificado de Capacitación. Origen: de oficio. Área: Área de Capacitación. Enviado por: Rosa Quispe Huamán. Fecha: 07/10/2026.
- Taller: **"Manejo integrado de plagas en café"**, del 14 al 16 de setiembre de 2026, 24 horas, en el Local comunal de Río Negro, Satipo.
- Estado inicial: **Pendiente** (precargado; existe desde el inicio aunque Rosa no haya hecho su flujo).

Beneficiarios (los que carga "Importar desde Excel"):

| N.° | Nombres | Apellidos | DNI |
|---|---|---|---|
| 1 | Juan | Ccori Pari | 45218736 |
| 2 | María Elena | Rojas Soto | 47390125 |
| 3 | Pedro | Huaman Inga | 43876512 |
| 4 | Rosa Luz | Chuquimantari Pérez | 46021987 |
| 5 | Wilber | Quispe Casancho | 4419823 (error de 7 dígitos; se corrige a 44198236) |
| 6 | Nelly | Mayta Huarcaya | 48132760 |
| 7 | Edison | Shimpukat Kinchokre | 44567201 |
| 8 | Gladys | Sanchez Ñaupari | 45903318 |

El certificado de Juan Ccori Pari tiene el código **`DRA-2026-J4C7QX`**. Los demás códigos del lote: (ver prototipo).

### 5.4 Otros documentos y lotes

| Código o lote | Tipo | Beneficiario | Área / envía | Fecha | Estado inicial | Notas |
|---|---|---|---|---|---|---|
| Lote 2026-006 | Certificado de Capacitación | 12 beneficiarios (ver prototipo) | Área de Capacitación | Taller 22–24/09/2026; firmado 02/10/2026 | Firmado e impreso | Taller "Buenas prácticas de cosecha de cacao". Su último certificado (Norma Baldeón Quispe) se usa en la demo de anulación |
| `DRA-2026-K7M4PX` | Certificado de Capacitación | Juan Ccori Pari | Área de Capacitación | 01/10/2026 | Observado | Motivo: "El nombre no coincide con el registrado en el DNI" |
| `DRA-2026-P3W8TR` | Certificado de Reconocimiento | María Elena Rojas Soto | Área de Capacitación / Rosa | 30/09/2026 | Pendiente | Historial: registrado 09:15, enviado 09:40 |
| `DRA-2026-H5R8NZ` | Certificado de Capacitación | Pedro Huaman Inga (DNI 43876512) | Área de Capacitación | Firmado 25/09/2026 11:20 | Firmado | Taller de cacao, 22–24/09/2026, Pampa Hermosa. Se usa en la demo de reemisión (apellido sin tilde) |
| `DRA-2026-T6N9QE` | Constancia de Productor Activo | Teodoro Inga Mamani (DNI 44731958) | Área de Desarrollo Agrario / Marco Salazar Vela | 28/09/2026 | Pendiente | EXP-2026-004817 |
| `DRA-2026-V3J7XC` | Certificado de Prácticas | Kevin Ramos Ccanto (DNI 46385127) | Área de Administración / Silvia Poma Torres | 03/10/2026 | Pendiente | Expediente (ver prototipo) |
| `DRA-2026-F8R2MA` | Certificado de Trabajo | Lucía Paredes Quinto (DNI 45829364) | Área de Administración / Silvia Poma Torres | 05/10/2026 | Pendiente | Expediente (ver prototipo). Falla la primera vez que se firma |
| `DRA-2026-B9T3QW` | (ver prototipo) | (ver prototipo) | — | — | Firmado | Aparece en los avisos de Rosa y Luis |
| `DRA-2026-W4E6YJ` | Constancia | (ver prototipo) | — | — | Firmado | Aparece en los avisos de Luis |
| `DRA-2026-U7H3KW` | Certificado de Capacitación | Pedro Huamán Inga | Área de Capacitación | Se crea en la demo | — | Reemisión de H5R8NZ (código fijo) |

Nota: Pedro Huaman Inga y María Elena Rojas Soto aparecen en más de un documento con el mismo DNI, a propósito: una persona puede tener varios certificados.

### 5.5 Bandeja inicial del Director ("Por revisar")

Cinco elementos, del más antiguo al más reciente:

1. Constancia de Productor Activo – Teodoro Inga Mamani – Área de Desarrollo Agrario – Marco Salazar Vela – 28/09/2026
2. Certificado de Reconocimiento – María Elena Rojas Soto – Área de Capacitación – Rosa Quispe Huamán – 30/09/2026
3. Certificado de Prácticas – Kevin Ramos Ccanto – Área de Administración – Silvia Poma Torres – 03/10/2026
4. Certificado de Trabajo – Lucía Paredes Quinto – Área de Administración – Silvia Poma Torres – 05/10/2026
5. **Lote 2026-007** – Manejo integrado de plagas en café – 8 certificados – Área de Capacitación – Rosa Quispe Huamán – 07/10/2026

### 5.6 Avisos iniciales

| Rol | Avisos iniciales |
|---|---|
| Área encargada | Observación de DRA-2026-K7M4PX; firma de DRA-2026-B9T3QW; firma de DRA-2026-H5R8NZ |
| Director | "Nuevo documento pendiente" para elementos de su bandeja (Lote 2026-007, Lucía Paredes Quinto y Kevin Ramos Ccanto) |
| Consulta interna | DRA-2026-B9T3QW, DRA-2026-H5R8NZ y DRA-2026-W4E6YJ listos para entrega física |

### 5.7 Datos técnicos de auditoría

Valores ficticios mostrados solo en la sección técnica:

- Huella digital (SHA-256): cadena hexadecimal de 64 caracteres.
- Identificador de almacenamiento (CID): cadena que empieza con `bafybei`.
- Transacción de registro: `0x` + 64 caracteres hexadecimales.
- Billetera firmante: `0x7c1E…4B9a` (Ing. Carlos Mendoza Rivera).
- En documentos anulados se agrega "Transacción de anulación".

---

## 6. Pantallas

### 6.1 Comunes

#### Inicio de sesión
- Fondo crema; tarjeta blanca centrada.
- Logo de la DRA, título "Plataforma de Certificados y Constancias", subtítulo "Agencia Agraria Satipo – DRA Junín".
- Campos "Usuario" ("Ingrese su usuario") y "Contraseña" ("Ingrese su contraseña"), con ícono de ojo para mostrar u ocultar. La contraseña inicia oculta. Autocompletado del navegador desactivado.
- Botón primario "Ingresar".
- Error: "Usuario o contraseña incorrectos" en rojo con ícono; el usuario escrito se conserva.
- No hay accesos de demostración: el login es único.

#### Estructura general (todas las pantallas internas)
- **Menú lateral** verde: logo y "Agencia Agraria Satipo" arriba; opciones según el rol. La opción activa tiene fondo verde más claro y una barra dorada a la izquierda.
- **Encabezado** blanco: título de la pantalla a la izquierda; a la derecha, la campana con contador, un círculo con las iniciales, el nombre y el rol completo, y el botón "Cerrar sesión" (vuelve al login).
- **Contenido** sobre fondo crema.

#### Panel de notificaciones
Ver la sección 4.3.

### 6.2 Área encargada (Rosa)

#### Inicio
Saludo "Buenos días, Rosa" y las tres tarjetas de la sección 4.4.

#### Mis documentos
- Botón primario "Nuevo documento".
- Pestañas de filtro: Todos · Pendientes · Observados · Firmados · Rechazados ("Rechazados" sin datos muestra un estado vacío).
- Tabla: Código o lote · Tipo · Beneficiario(s) · Fecha de envío · Estado.
- Las filas de lote llevan un ícono de grupo. Si un lote tiene certificados anulados, muestra "1 anulado" o "N anulados".
- Al pulsar una fila se abre su detalle (o la corrección, si está Observado).

#### Nuevo documento
- Texto "Seleccione el tipo de documento que desea emitir".
- Dos tarjetas: **Certificado de Capacitación** ("Para participantes de talleres y capacitaciones. Emisión por lista.") que abre el formulario, y **Certificado de Reconocimiento**, atenuado con "Disponible próximamente".
- Nota: "Solo se muestran los tipos de documento asignados a su área."

#### Emisión por lista: Certificado de Capacitación
- Etiqueta "Origen: De oficio".
- Indicador de pasos: 1 Datos del evento · 2 Beneficiarios · 3 Vista previa.
- **Datos del evento** (prellenados y editables): nombre del taller, fecha de inicio, fecha de fin, duración, lugar y área organizadora (ver 5.3).
- **Beneficiarios:**
  - Botones: "Descargar plantilla Excel" (aviso "Plantilla descargada"), "Importar desde Excel" (carga las 8 filas de 5.3) y "Agregar beneficiario" (fila vacía).
  - Estado vacío inicial: "Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno."
  - Tabla editable: N.° · Nombres · Apellidos · DNI · eliminar.
  - La fila 5 aparece en rojo con "El DNI debe tener 8 dígitos" y arriba "Hay 1 error en la lista. Corríjalo para continuar." Al corregir a 44198236: "8 beneficiarios listos".
  - Botón "Continuar a vista previa", deshabilitado si hay errores o la lista está vacía.
- El formulario empieza vacío en cada nuevo registro (no conserva beneficiarios anteriores).

#### Vista previa y envío
- Certificado de ejemplo en formato horizontal con marca de agua diagonal "VISTA PREVIA":
  - Logo y "AGENCIA AGRARIA SATIPO – DRA JUNÍN"; título "CERTIFICADO"; "Otorgado a" y el nombre del primer beneficiario en grande.
  - Texto: "Por haber participado en el taller de capacitación '[taller]', realizado del [fechas] en [lugar], con una duración de [horas] horas."
  - Pie: "Fecha de emisión: se asignará al firmar" · recuadro "Código QR: se generará al firmar" · línea de firma con "Ing. Carlos Mendoza Rivera – Director de la Agencia Agraria Satipo".
- Panel "Resumen del lote": cantidad de certificados, taller, fechas, lista de nombres y "Se generará un certificado por cada beneficiario."
- Botones "Volver" (conserva los datos) y "Enviar a revisión".
- Confirmación: "¿Enviar 8 certificados a revisión del Director? Mientras estén en revisión no podrá modificarlos." (Cancelar · Enviar).
- Éxito: "¡Listo! Se enviaron 8 certificados a revisión (Lote 2026-NNN)". Vuelve a Mis documentos con la fila nueva al inicio, en Pendiente. Como el Lote 2026-007 ya existe, un nuevo envío crea el **Lote 2026-008** y siguientes.

#### Corregir documento observado (individual)
- Recuadro naranja: "Observado por Ing. Carlos Mendoza Rivera el [fecha y hora]" y el motivo.
- Datos del evento en solo lectura; datos del beneficiario editables con la misma validación.
- Vista previa con marca de agua a la derecha.
- Botones "Cancelar" y "Reenviar a revisión". Éxito: "Documento reenviado a revisión".

#### Corregir lote observado
Una sola pantalla para editar los datos del evento y la lista de beneficiarios, y reenviar el lote completo. Vuelve a la bandeja como "Corregido" y "Sin revisar".

#### Detalle del documento (solo lectura)
Datos e historial del documento. **Sin** la sección técnica de auditoría y **sin** botones de impresión. En documentos firmados de su área (incluidos los certificados dentro de un lote) muestra el botón secundario **"Reemitir con corrección"**.

#### Reemisión
- Recuadro azul: "Reemisión de [código]. Cuando el Director firme el nuevo documento, el original se anulará automáticamente."
- Formulario precargado con **todos** los datos del original (taller, fechas, lugar, DNI, lote de origen), editables.
- Campo obligatorio "Motivo de la reemisión".
- Vista previa con marca de agua.
- Botones "Cancelar" y "Enviar a revisión". Éxito: "Reemisión enviada a revisión". El original sigue Firmado con la marca "Reemisión en revisión".

### 6.3 Director (Carlos)

#### Inicio
Saludo "Buenos días, Carlos" y las tres tarjetas de la sección 4.4.

#### Por revisar
- Subtítulo: "Documentos enviados por las áreas, del más antiguo al más reciente."
- Tabla: casilla · Tipo · Beneficiario(s) · Área · Enviado por · Fecha de envío · Revisión (con número de expediente cuando corresponde).
- Columna Revisión: "Sin revisar" (gris) o "Revisado" (visto verde) después de abrir el elemento.
- La casilla está deshabilitada hasta revisar el elemento ("Revise el documento antes de seleccionarlo.").
- Etiquetas "Corregido" y "Reemisión" cuando aplican.
- Barra fija al seleccionar: "[N] seleccionados ([M] certificados)" y botón "Firmar seleccionados".
- Bandeja vacía: "¡Todo al día! No tiene documentos pendientes de revisión."

#### Revisión de un lote
- Título "Revisión de lote – Lote 2026-NNN"; enlace "← Volver a Por revisar".
- Franja con los datos del evento y quién lo envió.
- Izquierda: certificado del beneficiario seleccionado (con marca de agua), navegable con "‹ Anterior / Siguiente ›" ("Certificado 3 de 8").
- Derecha: lista de beneficiarios (nombre y DNI) con casillas; al pulsar un nombre se muestra su certificado.
- Acciones: "Rechazar lote" (rojo), "Observar lote", "Observar seleccionados" (activo solo con beneficiarios marcados), "Firmar lote" (primario).
- Abrir esta pantalla marca el lote como Revisado.

#### Revisión de un documento individual
- Datos del documento (con número de expediente si es a solicitud de parte) y el documento.
- En la constancia de Teodoro, el texto sigue a "Otorgado a" sin repetir el nombre: "Por encontrarse registrado como productor activo en el ámbito de la Agencia Agraria Satipo…".
- Botones: "Rechazar" (rojo), "Observar", "Firmar".
- En una reemisión: recuadro "Este documento reemplaza a [código]", lista de cambios (por ejemplo, "Apellido: Huaman Inga → Huamán Inga") y el motivo.

#### Ventana de motivo
- Título según la acción: "Observar lote", "Observar beneficiarios seleccionados", "Rechazar lote", "Observar documento", "Rechazar documento" o "Anular documento".
- Campo obligatorio "Motivo", con el texto de ayuda "Explique qué debe corregirse" solo dentro del campo.
- En rechazos: "El rechazo es definitivo. El documento no podrá reenviarse."
- En anulación: "La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad."
- Botones "Cancelar" y "Confirmar" (deshabilitado si el motivo está vacío).

#### Firma (tres pasos)
1. **Ventana de la billetera (simulación de MetaMask):** ícono genérico de billetera, título "MetaMask – Confirmar firma (simulación)", "Cuenta: Ing. Carlos Mendoza Rivera (0x7c1E…4B9a)", "Acción: Firmar [N] certificados", "Costo de la operación: Sin costo". Botones "Cancelar" y "Confirmar".
2. **Progreso:** "Verificando su billetera" → "Preparando los documentos ([N] de [N])" → "Registrando la firma" → "Confirmando el registro".
3. **Resultado:** "¡Listo! Se firmaron [N] certificados", el detalle del lote o documento y "Mesa de Partes fue notificada para su impresión y entrega." Botón "Volver a Por revisar".

#### Documentos firmados
- Buscador por nombre o código.
- Tabla: Código o lote · Tipo · Beneficiario(s) (con DNI) · Área · Fecha de firma · Estado · Acciones.
- Orden: por fecha y hora de firma, de la más reciente a la más antigua.
- Las filas de lote se despliegan en sus certificados. El botón **"Anular"** (rojo, pequeño) está en cada certificado individual, no en la fila del lote.

#### Anulación (tras confirmar el motivo)
1. Billetera: "Acción: Anular 1 documento".
2. Progreso: "Verificando su billetera" → "Registrando la anulación" → "Confirmando el registro".
3. Resultado: "Documento anulado", con el código y el nombre del beneficiario.

### 6.4 Consulta interna (Luis)

#### Inicio
Saludo "Buenos días, Luis" y las tres tarjetas de la sección 4.4.

#### Buscar documentos
- Buscador: "Buscar por nombre, DNI, código o número de expediente". Admite coincidencias parciales.
- Filtros rápidos: Todos · Listos para entregar · Firmados · Anulados.
- Tabla: Código · Tipo · Beneficiario · DNI · Área · Estado · Fecha de firma.
- Lotes como fila con ícono de grupo, desplegables en sus certificados, cada uno con su código. Botón "Imprimir lote (N)".
- Sin resultados: "No se encontraron documentos con esos datos."
- El aviso de un lote listo abre esta pantalla filtrada y con el lote desplegado.

#### Detalle del documento
- Encabezado: código, etiqueta de estado y tipo.
- **Datos:** beneficiario, DNI, tipo, origen, área, lote, taller y fechas (y número de expediente si corresponde).
- **Historial** en línea de tiempo, con fecha, hora y responsable. Eventos posibles: Registrado · Enviado a revisión · Revisado · Observado (con motivo) · Corregido (con dato anterior y nuevo) · Reenviado · Rechazado (con motivo) · Error al preparar el documento – devuelto a Por revisar · Firmado · Mesa de Partes notificada · Impreso · Duplicado impreso · Reemisión solicitada · Anulado (con motivo) · Anulado por reemisión – reemplazado por [código] · Reemplaza a [código].
- **Detalle técnico de auditoría** (plegado por defecto; único lugar con términos técnicos): ver 5.7. Cada valor con botón de copiar ("Copiado").
- Botones: "Ver documento", "Descargar PDF" e "Imprimir".
- En documentos rechazados: recuadro rojo con el motivo y el expediente.

#### Documento final
- Mismo diseño que la vista previa, **sin marca de agua** y con los datos definitivos:
  - Abajo a la izquierda: "Satipo, [fecha de emisión]".
  - Al centro: código QR ilustrativo y debajo el código del documento.
  - A la derecha: firma de "Ing. Carlos Mendoza Rivera – Director de la Agencia Agraria Satipo" y "Firmado en la plataforma el [fecha]".
  - Franja al pie: "Documento registrado de forma inalterable. Verifique su autenticidad en verifica.agrojunin.gob.pe o escaneando el código QR."
- Botones "Descargar PDF" e "Imprimir".
- Nota: "Puede volver a imprimir este documento cuando sea necesario, por ejemplo, ante una pérdida (duplicado)."

---

## 7. Flujos paso a paso

Cada flujo indica con qué usuario ingresar. Se recomienda recorrerlos en este orden, en una sola pestaña.

### F1. Registrar una emisión por lista (Rosa)
1. Ingresar con `rquispe` / `Demo2026`.
2. Menú "Nuevo documento" → tarjeta "Certificado de Capacitación".
3. Revisar los datos del evento (ya llenos).
4. Pulsar "Importar desde Excel" → aparecen 8 beneficiarios; la fila 5 está en rojo.
5. Corregir el DNI de Wilber a `44198236` → aparece "8 beneficiarios listos".
6. "Continuar a vista previa" → revisar el certificado de ejemplo y el resumen.
7. "Enviar a revisión" → confirmar → aviso de éxito con el número de lote.
8. En "Mis documentos", el lote nuevo aparece primero, en Pendiente.

### F2. Revisar y firmar el lote completo (Director)
1. Cerrar sesión e ingresar con `cmendoza`.
2. Menú "Por revisar" → pulsar la fila del Lote 2026-007.
3. Navegar entre certificados con "Siguiente" y revisar la lista.
4. "Firmar lote" → en la ventana de la billetera, "Confirmar".
5. Observar los 4 pasos del progreso → resultado "¡Listo! Se firmaron 8 certificados".
6. El contador de "Por revisar" baja de 5 a 4; el lote aparece en "Documentos firmados".
7. Variante: en la ventana de la billetera pulsar "Cancelar" → "Firma cancelada. Los documentos siguen pendientes de firma."

### F3. Ver el resultado como Rosa y como Mesa de Partes
1. Ingresar con `rquispe` → la campana tiene el aviso "El Lote 2026-007 fue firmado (8 certificados)"; en Mis documentos el lote está Firmado.
2. Ingresar con `ltorres` → aviso "Lote 2026-007 listo para entrega física (8 certificados)".
3. Pulsar el aviso → se abre "Buscar documentos" con el lote desplegado.
4. Pulsar el certificado de Juan Ccori Pari → detalle con datos, historial y sección técnica.
5. "Ver documento" → documento final con fecha, QR (`DRA-2026-J4C7QX`), firma y leyenda.
6. "Imprimir lote (8)" → "Se enviaron 8 certificados a impresión"; el lote sale de "Listos para entregar" y cada historial registra "Impreso por Luis Torres Paredes".
7. Volver a imprimir un certificado → "Duplicado impreso por…" y aumenta "Duplicados emitidos".

### F4. Observar a un beneficiario y corregirlo (alternativa a F2)
1. Como Director, abrir el Lote 2026-007 y marcar a Gladys Sanchez Ñaupari.
2. "Observar seleccionados" → motivo: "El DNI no coincide con la lista de asistencia del taller" → Confirmar.
3. El lote queda con 7 certificados. "Firmar lote" → resultado "¡Listo! Se firmaron 7 certificados" y "1 certificado fue observado y devuelto al área".
4. Como Rosa: aviso "El Director observó 1 certificado del Lote 2026-007: El DNI no coincide con la lista de asistencia del taller"; en Mis documentos aparece Gladys como Observado.
5. Abrir el documento → recuadro naranja con el motivo → corregir el DNI → "Reenviar a revisión".
6. Como Director: Gladys aparece en la bandeja como documento individual con la etiqueta "Corregido". Su historial muestra la observación, la corrección (DNI anterior y nuevo) y el reenvío.

### F5. Observar o rechazar un lote completo
- **Observar lote:** todo el lote pasa a Observado; Rosa recibe "El Director observó el Lote 2026-NNN: [motivo]", corrige en una sola pantalla y reenvía; vuelve como "Corregido" y "Sin revisar".
- **Rechazar lote:** todos sus certificados pasan a Rechazado; Rosa recibe "El Director rechazó el Lote 2026-NNN: [motivo]"; la fila del lote queda sin acciones.

### F6. Rechazar un documento a solicitud de parte (aviso a Mesa de Partes)
1. Como Director, abrir la constancia de Teodoro Inga Mamani (EXP-2026-004817) → "Rechazar" → motivo → Confirmar.
2. Como Luis: aviso "Rechazo para comunicar al solicitante: Constancia de Productor Activo – Teodoro Inga Mamani – EXP-2026-004817. Motivo: [motivo]".
3. El aviso abre el detalle en estado Rechazado con el recuadro rojo.

### F7. Firma múltiple con un documento que falla
1. Como Director, abrir y volver de las revisiones de Kevin, Lucía y otro documento individual para marcarlos como Revisados.
2. Seleccionarlos y pulsar "Firmar seleccionados" → Confirmar.
3. En el progreso: "2 de 3 preparados" y el aviso ámbar "1 documento no pudo prepararse".
4. Resultado: "Se firmaron 2 documentos" y el recuadro ámbar "1 documento no pudo prepararse y volvió a Por revisar: Certificado de Trabajo – Lucía Paredes Quinto. Puede intentarlo nuevamente."
5. Lucía vuelve a la bandeja como Revisado; su historial registra el error. Al reintentar, se firma correctamente.

### F8. Reemitir un documento (Rosa → Director)
1. Como Rosa, abrir el detalle de `DRA-2026-H5R8NZ` (Pedro Huaman Inga, Firmado) → "Reemitir con corrección".
2. Cambiar el apellido a "Huamán Inga" y escribir el motivo ("Corrección del apellido del beneficiario") → "Enviar a revisión".
3. Se crea `DRA-2026-U7H3KW` en Pendiente; el original sigue Firmado con "Reemisión en revisión".
4. Como Director: el documento aparece con la etiqueta "Reemisión"; al abrirlo, se ve "Este documento reemplaza a DRA-2026-H5R8NZ", el cambio "Apellido: Huaman Inga → Huamán Inga" y el motivo.
5. Firmar → "¡Listo! Se firmó 1 documento. El documento original DRA-2026-H5R8NZ fue anulado y reemplazado."
6. Resultado: H5R8NZ pasa a Anulado ("Anulado por reemisión – reemplazado por DRA-2026-U7H3KW"); U7H3KW queda Firmado ("Reemplaza a DRA-2026-H5R8NZ"). Rosa y Luis reciben sus avisos.

### F9. Anular un documento (Director)
1. Como Director, menú "Documentos firmados" → desplegar el Lote 2026-006.
2. En el último certificado (Norma Baldeón Quispe), pulsar "Anular".
3. Motivo: "Emitido por error: el beneficiario no asistió al taller" → Confirmar → billetera → progreso de 3 pasos → "Documento anulado".
4. El certificado aparece como Anulado en los tres roles, sin acciones. Rosa recibe "El Director anuló el documento [código]: [motivo]" y su fila del lote muestra "1 anulado". Luis lo ve en el filtro "Anulados" y su auditoría incluye la "Transacción de anulación".

### F10. Buscar documentos (Luis)
- Por nombre: "Ccori".
- Por DNI: "45218736".
- Por expediente: "004817" (Teodoro).
- Sin resultados: "Quintanilla" → "No se encontraron documentos con esos datos."

---

## 8. Mensajes del sistema

| Situación | Mensaje |
|---|---|
| Login incorrecto | Usuario o contraseña incorrectos |
| Plantilla | Plantilla descargada |
| Lista con error | Hay 1 error en la lista. Corríjalo para continuar. |
| DNI inválido | El DNI debe tener 8 dígitos |
| Lista correcta | 8 beneficiarios listos |
| Confirmar envío | ¿Enviar 8 certificados a revisión del Director? Mientras estén en revisión no podrá modificarlos. |
| Envío exitoso | ¡Listo! Se enviaron 8 certificados a revisión (Lote 2026-NNN) |
| Casilla deshabilitada | Revise el documento antes de seleccionarlo. |
| Bandeja vacía | ¡Todo al día! No tiene documentos pendientes de revisión. |
| Lote observado | Lote observado. Se notificó al área. |
| Firma cancelada | Firma cancelada. Los documentos siguen pendientes de firma. |
| Firma exitosa | ¡Listo! Se firmaron [N] certificados |
| Firma parcial por observación | 1 certificado fue observado y devuelto al área |
| Firma con error | 1 documento no pudo prepararse y volvió a Por revisar: [documento]. Puede intentarlo nuevamente. |
| Reenvío | Documento reenviado a revisión |
| Reemisión enviada | Reemisión enviada a revisión |
| Reemisión firmada | ¡Listo! Se firmó 1 documento. El documento original [código] fue anulado y reemplazado. |
| Anulación | Documento anulado |
| Descarga | Documento descargado |
| Impresión | Documento enviado a impresión |
| Impresión de lote | Se enviaron [N] certificados a impresión |
| Copiar valor técnico | Copiado |
| Búsqueda sin resultados | No se encontraron documentos con esos datos. |

---

## 9. Fuera del alcance del prototipo

| Elemento | Situación |
|---|---|
| Rol Administrador (usuarios, áreas, billeteras, firmantes) | No construido; se valida conversando con el negocio |
| "Mi cuenta" (cambio de contraseña) | No construido |
| Formulario individual a solicitud de parte | No construido; esos documentos aparecen como datos ya cargados |
| Certificado de Reconocimiento (formulario) | "Disponible próximamente" |
| Portal público de verificación | Proyecto aparte, pendiente de construir |
| Blockchain, IPFS, MetaMask, Excel, impresión y PDF reales | Simulados (ver 4.6) |
| Firma digital IOFE | Prevista para una fase posterior del sistema real |

---

## 10. Indicaciones para la demostración

1. Abrir el prototipo en pantalla completa (botón ▶ de Figma Make) desde una **ventana de incógnito**, para evitar el autocompletado del navegador.
2. Hacer **toda la demostración en una sola pestaña**. Si se abre otra pestaña o Figma Make modifica el prototipo, los datos vuelven al estado inicial.
3. **No modificar el prototipo** el día de la reunión.
4. Para empezar limpio, cerrar la pestaña y abrir una nueva.
5. Orden sugerido: F1 → F2 → F3 → F4 → F6 → F7 → F8 → F9 → F10. F4 es una alternativa a F2 (elegir uno de los dos caminos para el Lote 2026-007).
