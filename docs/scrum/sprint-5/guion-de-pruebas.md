# Guion de pruebas del Sprint 5 para el PO

Este guion le permite al Product Owner probar las tres historias del Sprint 5 y decidir si las aprueba. Por primera vez se prueba el **portal público de verificación**, el que usará cualquier persona, como un empleador o una municipalidad, para comprobar si un certificado es auténtico. Se prueba con **su propio celular**.

Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU21: Comprobar la autenticidad del documento | DRA-34 | 8 |
| HU19: Verificar mediante el código QR | DRA-32 | 5 |
| HU20: Verificar mediante el código de verificación | DRA-33 | 3 |

HU21 no tiene pantalla propia: es la comprobación que hace el servidor y que el portal muestra. Por eso se prueba a través de HU19 y HU20.

**En la misma sesión** se pueden hacer también los guiones de los Sprints 3 y 4, cuya validación quedó pendiente (tarea DRA-48): [Sprint 3](../sprint-3/guion-de-pruebas.md) y [Sprint 4](../sprint-4/guion-de-pruebas.md). Si se hacen antes, la plataforma ya tiene documentos firmados, anulados y reemitidos, y la preparación de este guion se reduce al paso 0.4.

## Antes de empezar

El equipo de desarrollo levanta la plataforma en una computadora conectada a la misma red Wi-Fi que el celular del PO. Usa la dirección de esa computadora en la red, para que el QR de los documentos se pueda abrir desde el celular:

```bash
PLATAFORMA_PORTAL_URL=http://<IP de la computadora>:5174 ./e2e/levantar.sh demo
```

Al terminar, muestra lo mismo que en el Sprint 4:

- la plataforma (<http://localhost:5173>) y el usuario `admin` con su contraseña temporal;
- las dos claves de prueba para MetaMask;
- además, la **dirección del portal público**, por ejemplo `http://192.168.1.20:5174`.

**Las claves son solo de prueba.** Son billeteras nuevas, sin valor. Nunca las use fuera de esta demostración.

Se necesitan:

- la computadora con MetaMask, como en los Sprints 3 y 4;
- **un celular con cámara**, conectado a la misma red Wi-Fi. No necesita ninguna aplicación: basta la cámara o el lector de QR que trae el celular.

Recomendaciones:

- **Siga el guion en orden y en una sola sesión.** Cada vez que la plataforma se vuelve a levantar empieza vacía.
- **Anote el número del paso** si algo no se ve como se espera.
- Los pasos **"con ayuda del equipo"** piden un comando en la computadora donde corre la plataforma.

Cuentas que se usan (las mismas de los Sprints 2 a 4):

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| pmorales | Pedro Morales Ccanto | Área encargada – Área de Administración | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |

---

## 0. Preparación: documentos firmados, uno anulado y uno reemitido

**Objetivo:** tener documentos en los tres estados que muestra el portal. Todo esto se construyó en los Sprints 1 a 4, así que aquí no se evalúa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Como `admin`, cree las cuentas `pmorales` y `cmendoza`, registre la billetera del Director y otórguele el rol de firmante, como en el paso 0.2 del Sprint 4. | La fila del Director dice "✓ Firmante activo". |
| 0.2 | Como `pmorales`, registre tres **Certificados de Trabajo** con el cargo `asistente administrativa` y las fechas del 02/01/2025 al 30/09/2026:<ul><li>Lucía Paredes Quinto, DNI `45829364`, expediente `EXP-2026-005391`;</li><li>Kevin Ramos Ccanto, DNI `46385127`, expediente `EXP-2026-005392`;</li><li>Martha Rojas Inga, DNI `44200001`, expediente `EXP-2026-005401`.</li></ul> | Los tres quedan Pendientes. |
| 0.3 | Como `cmendoza`, abra cada uno en Por revisar y fírmelo con MetaMask. | "¡Listo! Se firmó 1 documento." tres veces. |
| 0.4 | **Con ayuda del equipo:** ejecute `./e2e/ver-registro.sh`. Anote los tres códigos (`DRA-2026-…`) y abra en la computadora el enlace "PDF en IPFS" de cada uno. | Se abren los tres PDF firmados, cada uno con su código QR y su código de verificación debajo. |

---

## 1. HU19 y HU21: Verificar con el código QR (DRA-32, DRA-34)

**Objetivo:** comprobar que, al escanear el QR de un documento, el celular abre el portal y muestra en menos de dos segundos si es auténtico, sin pedir registro, y que si es válido muestra el documento completo.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | Con la cámara del celular, escanee el QR del PDF de **Lucía** que está en la pantalla de la computadora, y abra el enlace. | Se abre el portal "Agencia Agraria Satipo – DRA Junín · Verificación de documentos". **No pide usuario ni contraseña.** Por un instante puede verse "Verificando el documento…". |
| 1.2 | Mire el resultado. | En menos de dos segundos aparece **Documento válido**: "El documento es auténtico: coincide con su registro en la blockchain."<ul><li>Tipo: Certificado de Trabajo;</li><li>Titular: Lucía Paredes Quinto;</li><li>Fecha de emisión con el mes en letras;</li><li>Estado: Vigente.</li></ul>El resultado no muestra el DNI. |
| 1.3 | Baje en la página. | En "Documento completo" se ve **el certificado firmado**, con su QR y su código, igual al de la computadora. |
| 1.4 | Pulse "Descargar PDF" y luego "Abrir el documento". | El celular guarda o abre el mismo PDF. |
| 1.5 | Abra la dirección del portal en el navegador de la computadora y escriba al final `/verificar/` seguido de letras al azar. | **Documento no válido**: "No encontramos un documento válido con estos datos.", sin datos ni documento. |

## 2. HU21: Un documento anulado o reemplazado (DRA-34)

**Objetivo:** comprobar que el portal informa cuando un documento ya no es válido, con la fecha, y si existe una versión corregida, sin revelar su código.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como Director, en **Documentos firmados**, anule a **Martha** con el motivo `Prueba de anulación` y confirme en MetaMask (HU29). | "Documento anulado." |
| 2.2 | Escanee con el celular el QR del PDF de **Martha**. | **Documento anulado**: "Este documento fue anulado y ya no es válido.", con sus datos y la **fecha de anulación**. **No se muestra el documento.** |
| 2.3 | Como `pmorales`, en el detalle de **Kevin**, pulse "Reemitir con corrección". Cambie el cargo a `secretaria`, escriba el motivo `Cargo equivocado` y envíelo. Como Director, firme la reemisión desde Por revisar (HU30). | "¡Listo! Se firmó 1 documento." |
| 2.4 | Escanee con el celular el QR del PDF **original** de Kevin, el de la computadora. | **Documento anulado**, con el aviso "Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo." **No aparece el código de la versión corregida.** |
| 2.5 | **Opcional, con ayuda del equipo:** detenga el almacenamiento con `docker stop e2e-ipfs` y escanee de nuevo el QR de Lucía. Luego enciéndalo con `docker start e2e-ipfs` y pulse "Intentar nuevamente". | Primero: "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.", **no** "No válido". Después: Documento válido. |

## 3. HU20: Verificar con el código de verificación (DRA-33)

**Objetivo:** comprobar que, sin escanear el QR, se puede verificar escribiendo el código impreso; que se ven solo los datos básicos; y que hay un límite de consultas.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | En el celular, abra la dirección del portal (sin `/verificar/…`). | La portada "Verifique un documento", con los tres pasos del QR y, debajo, "¿No puede escanear el código QR?" con el campo **Código de verificación**. |
| 3.2 | Escriba `DRA-26-123` y pulse "Verificar". | Junto al campo: "Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA." |
| 3.3 | Escriba el código de **Lucía** en minúsculas y con espacios en lugar de guiones (por ejemplo, `dra 2026 abc123`) y pulse "Verificar". | El campo se corrige a `DRA-2026-…` y aparece **Documento válido** con el tipo, el titular, la fecha de emisión y "Vigente". **No se muestra el documento**: "Para ver el documento completo, escanee su código QR." |
| 3.4 | Escriba el código de **Martha**. | **Documento anulado**, con la fecha de anulación. |
| 3.5 | Pulse "Verificar" una y otra vez, rápido, hasta 12 veces. | A partir de la consulta 11 dentro del mismo minuto: "Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente." Pasado un minuto, vuelve a funcionar. |

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 5. Si nota que falta, no es una observación:

- **Publicar el portal en internet**, con un dominio propio como `verifica.agrojunin.gob.pe`: requiere la infraestructura en AWS (DRA-44). Hoy el portal funciona en la red local de la demostración.
- **Descargar o imprimir el PDF firmado desde la plataforma interna:** llega con HU25 (Sprint 6). Mientras tanto, el equipo lo abre con `./e2e/ver-registro.sh`.
- **Registrar cada consulta del portal para la auditoría:** llega con HU24 (Sprint 6).

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-32, DRA-33 y DRA-34):

- **Si todo se vio como se espera,** deje el comentario `Aprobado` y mueva el ticket a **Listo**.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El ticket queda en "En revisión" y el equipo carga el ajuste para el Sprint 6.
- **Si tiene un cambio de criterio** sobre las [decisiones de la revisión](revision.md#decisiones-a-validar), indíquelo en el comentario aunque apruebe.

Si en la misma sesión se probaron los Sprints 3 y 4, la decisión sobre esas historias va en sus propios tickets (DRA-21 a DRA-31) y se resume en DRA-48.
