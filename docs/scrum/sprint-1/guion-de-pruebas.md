# Guion de pruebas del Sprint 1 para el PO

Este guion le permite al Product Owner probar las seis historias del Sprint 1 desde la pantalla y decidir si las aprueba. Cada historia tiene:

- su objetivo;
- los pasos a seguir;
- lo que debe ver en cada paso.

Al final se explica cómo dejar el ok en el ticket de Jira.

| Historia | Ticket | Puntos |
|---|---|---|
| HU01: Crear cuentas de usuario | DRA-12 | 3 |
| HU02: Editar o desactivar cuentas | DRA-13 | 2 |
| HU03: Iniciar sesión según el rol | DRA-14 | 5 |
| HU04: Cambiar o restablecer la contraseña | DRA-15 | 3 |
| HU05: Asignar el área a un usuario | DRA-16 | 3 |
| HU06: Registrar la billetera del director y su rol de firmante | DRA-17 | 8 |

## Antes de empezar

El equipo de desarrollo deja la plataforma lista, sin datos, y le entrega:

- la dirección de la plataforma (por ejemplo, <http://localhost:5173>);
- el usuario `admin` con su contraseña temporal;
- MetaMask instalado en el navegador, con la cuenta del Administrador del contrato ya importada y una segunda cuenta cualquiera, que no administra el contrato. Solo se usa en HU06;
- la dirección de la billetera que se registra como billetera del director.

Todas las billeteras son solo de prueba y no tienen valor.

Recomendaciones:

- **Siga las historias en el orden de este guion.** Cada una usa las cuentas que crea la anterior. El orden no es el de la numeración porque, por ejemplo, para probar el inicio de sesión primero tienen que existir las cuentas.
- **Algunas pruebas necesitan dos personas conectadas a la vez.** Use una ventana normal para el Administrador y una ventana de incógnito (o de otro navegador) para la otra persona.
- **Anote el número del paso** si algo no se ve como se espera. Eso es lo que se escribe en el ticket.

Contraseñas que se usan en el guion (puede usar otras, siempre que tengan de 8 a 20 caracteres):

| Cuenta | Contraseña temporal | Contraseña propia |
|---|---|---|
| admin | La que entrega el equipo | AdminPropia26 |
| rquispe, cmendoza, ltorres | Demo2026 | Propia2026 |

---

## 1. HU01: Crear cuentas de usuario (DRA-12)

**Objetivo:** comprobar que el Administrador puede dar de alta al personal con un único rol, que el nombre de usuario no se repite y que la cuenta queda activa al crearse.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | Abra la plataforma. Ingrese con `admin` y la contraseña temporal. | Aparece la pantalla "Cambie su contraseña". Es obligatorio cambiarla: esto se valida en detalle en HU04. |
| 1.2 | Escriba la contraseña temporal, luego `AdminPropia26` dos veces, y pulse "Cambiar contraseña". | Entra a la plataforma. El menú muestra Inicio, Usuarios y Billetera del director. |
| 1.3 | Entre a **Usuarios**. | Aparece la lista de cuentas, con la cuenta `admin`. Cada fila muestra nombre de usuario, nombre completo, rol, estado y fecha de creación. |
| 1.4 | Pulse "Nueva cuenta". Escriba `ab` como nombre de usuario, deje vacío el nombre completo y pulse "Crear cuenta". | La cuenta no se crea. Se indica qué campo corregir: el usuario debe tener de 4 a 30 caracteres y el nombre completo es obligatorio. |
| 1.5 | Cree la cuenta `rquispe`: nombre "Rosa Quispe Huamán", rol **Área encargada**, área **Área de Capacitación** y contraseña temporal `Demo2026`. El campo Área se valida en HU05. | Se muestra "Se creó la cuenta rquispe". La cuenta aparece en la lista, con estado **Activa**. |
| 1.6 | Cree la cuenta `cmendoza`: nombre "Ing. Carlos Mendoza Rivera", rol **Director** y contraseña `Demo2026`. | Se crea y aparece activa en la lista. |
| 1.7 | Cree la cuenta `ltorres`: nombre "Luis Torres Paredes", rol **Consulta interna** y contraseña `Demo2026`. | Se crea y aparece activa en la lista. |
| 1.8 | Revise el campo Rol de cualquier formulario. | Solo se puede elegir un rol por cuenta. |
| 1.9 | Intente crear otra cuenta con el usuario `RQuispe` (con mayúsculas), cualquier nombre, rol Director y contraseña `Demo2026`. | La cuenta no se crea. Se muestra "El nombre de usuario ya está registrado". |

---

## 2. HU05: Asignar el área a un usuario (DRA-16)

**Objetivo:** comprobar que toda cuenta del Área encargada tiene un área, que esa persona solo ve los tipos de documento de su área y que un cambio de área rige aunque tenga la sesión abierta.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como `admin`, pulse "Nueva cuenta" y elija el rol **Área encargada**. Complete el resto de datos pero no elija área, y pulse "Crear cuenta". | La cuenta no se guarda. Se muestra "Seleccione el área de la persona". Pulse "Cancelar". |
| 2.2 | En el mismo formulario, elija el área **Área de Capacitación**. | Debajo se muestra qué emite el área: "Certificado de Capacitación, Certificado de Reconocimiento". |
| 2.3 | Cambie el rol a **Director** o a **Consulta interna**. Luego pulse "Cancelar". | El campo Área desaparece: solo existe para el Área encargada. |
| 2.4 | Revise la lista de Usuarios. | La fila de `rquispe` muestra su área, Área de Capacitación, junto al rol. |
| 2.5 | En la ventana de incógnito, ingrese con `rquispe` / `Demo2026`. Cambie la contraseña temporal por `Propia2026`. | El encabezado muestra "Área encargada – Área de Capacitación". En Inicio aparece "Documentos que emite Área de Capacitación" con sus dos certificados. |
| 2.6 | Sin cerrar la sesión de Rosa, vuelva a la ventana del Administrador. Pulse "Editar" en `rquispe`, cambie el área a **Área de Desarrollo Agrario** y pulse "Guardar cambios". | Se muestra "Se guardaron los cambios". La lista muestra la nueva área. |
| 2.7 | En la ventana de Rosa, pulse **Inicio**. | Ahora aparece "Documentos que emite Área de Desarrollo Agrario" con la "Constancia de Productor Activo". Los certificados de Capacitación ya no aparecen. |

**Para validar con el PO:** los nombres de las tres áreas y los tipos de documento que emite cada una se tomaron del prototipo.

| Área | Tipos de documento |
|---|---|
| Área de Capacitación | Certificado de Capacitación, Certificado de Reconocimiento |
| Área de Desarrollo Agrario | Constancia de Productor Activo |
| Área de Administración | Certificado de Prácticas, Certificado de Trabajo |

Si alguno no es correcto, indíquelo en el ticket.

---

## 3. HU03: Iniciar sesión según el rol (DRA-14)

**Objetivo:** comprobar que hay un solo inicio de sesión para todos y que cada persona ve solo las opciones de su rol. También que tres intentos fallidos bloquean la cuenta una hora y que la sesión expira por inactividad.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | En la ventana de incógnito, cierre la sesión de Rosa con "Cerrar sesión". | Vuelve a la pantalla de inicio de sesión. |
| 3.2 | Ingrese con `rquispe` y una contraseña equivocada. Luego, con un usuario que no existe, por ejemplo `nadie`. | En los dos casos se muestra el mismo mensaje, "Usuario o contraseña incorrectos", sin decir cuál de los dos falló. El usuario escrito se conserva. |
| 3.3 | Ingrese con `CMENDOZA` (en mayúsculas) y `Demo2026`. Cambie la temporal por `Propia2026`. | Entra como Carlos, porque el usuario no distingue mayúsculas. El encabezado muestra su nombre y su rol, Director. El menú muestra solo Inicio, Por revisar y Documentos firmados. |
| 3.4 | Abra "Por revisar". | Se muestra el aviso "Se habilita en el Sprint 3", porque esa pantalla todavía no existe. Las demás opciones futuras tienen el mismo tipo de aviso. |
| 3.5 | Cierre sesión. Ingrese con `ltorres` / `Demo2026` y cambie la temporal por `Propia2026`. | El menú muestra solo Inicio y Buscar documentos. |
| 3.6 | Con la sesión de Luis abierta, escriba en la barra de direcciones la dirección de la plataforma seguida de `#/usuarios`. | No se muestra la pantalla de Usuarios. Se indica "No tiene permiso para ver esta sección". |
| 3.7 | Compare los menús que vio. | Área encargada (paso 2.5): Inicio, Mis documentos y Nuevo documento. Director: Inicio, Por revisar y Documentos firmados. Consulta interna: Inicio y Buscar documentos. Administrador: Inicio, Usuarios y Billetera del director. |
| 3.8 | Cierre sesión. Intente ingresar con `cmendoza` y una contraseña equivocada tres veces seguidas. | Al tercer intento se indica que la cuenta quedó bloqueada por 3 intentos fallidos y hasta qué hora. |
| 3.9 | Ingrese con `cmendoza` y la contraseña correcta, `Propia2026`. | Tampoco entra: mientras está bloqueada no se acepta ni la contraseña correcta. El desbloqueo se prueba en HU04, paso 4.4. |
| 3.10 | En la ventana del Administrador, entre a Usuarios. | La fila de `cmendoza` indica "Bloqueada hasta" con la hora. |
| 3.11 | **Opcional, porque toma 30 minutos:** deje una sesión abierta sin usarla durante 30 minutos y luego pulse cualquier opción del menú. | Vuelve al inicio de sesión con el aviso "Su sesión expiró por inactividad". |

---

## 4. HU04: Cambiar o restablecer la contraseña (DRA-15)

**Objetivo:** comprobar estas reglas de la contraseña:

- la contraseña temporal se debe cambiar en el primer ingreso;
- cambiar la contraseña exige la actual;
- ante un olvido o un bloqueo, el Administrador asigna una contraseña temporal nueva.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 4.1 | Recuerde los primeros ingresos de los pasos 1.1, 2.5, 3.3 y 3.5. | Con contraseña temporal solo se mostraba la pantalla "Cambie su contraseña", sin menú, hasta cambiarla. |
| 4.2 | Como `admin`, abra "Cambiar contraseña" en el encabezado. Escriba una contraseña actual equivocada y una nueva cualquiera dos veces. | No se cambia. Se indica "La contraseña actual no es correcta". |
| 4.3 | En el mismo formulario, pruebe una contraseña nueva de menos de 8 caracteres. Luego pruebe escribirla dos veces distinta. Al terminar, cierre el formulario sin cambiar nada. | No se acepta: se indica el problema en cada caso. |
| 4.4 | En Usuarios, pulse "Restablecer" en `cmendoza`, que está bloqueada desde el paso 3.8. Pulse "Generar" y luego "Restablecer contraseña". | Se muestra la contraseña temporal generada para entregarla a la persona. Anótela. Al pulsar "Listo", la fila ya no indica "Bloqueada hasta". |
| 4.5 | En la ventana de incógnito, ingrese con `cmendoza` y su contraseña anterior, `Propia2026`. | No entra: "Usuario o contraseña incorrectos". |
| 4.6 | Ingrese con `cmendoza` y la temporal que anotó. Cámbiela por `Propia2026`. | Le pide cambiarla y luego entra con su menú de Director. |
| 4.7 | Deje abierta la sesión de Carlos. Como `admin`, restablezca la contraseña de `cmendoza` escribiendo una temporal, por ejemplo `Temporal2026`. Luego, en la ventana de Carlos, pulse cualquier opción del menú. | La sesión de Carlos se cierra con el aviso de que el Administrador restableció su contraseña. Ingrese con la temporal y cámbiela otra vez por `Propia2026`. |
| 4.8 | Como `admin`, pulse "Restablecer" en su propia cuenta, `admin`. | No se permite. Se indica que para su propia cuenta use "Cambiar contraseña". Pulse "Cancelar". |
| 4.9 | Abra la sesión de `cmendoza` en dos ventanas a la vez, por ejemplo incógnito y otro navegador. En una de ellas, use "Cambiar contraseña" del encabezado. Escriba `Propia2026` como actual y `OtraPropia26` como nueva. | Se muestra "Su contraseña se cambió". |
| 4.10 | En la otra ventana, pulse cualquier opción del menú. | Esa sesión se cierra con el aviso "Su contraseña se cambió en otra sesión". La ventana desde la que se cambió sigue abierta. **Desde aquí, la contraseña de Carlos es `OtraPropia26`.** |

---

## 5. HU02: Editar o desactivar cuentas (DRA-13)

**Objetivo:** comprobar que el Administrador puede corregir datos y cambiar el rol de una cuenta. También que puede quitarle el acceso sin borrarla, y que una cuenta desactivada no puede entrar.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 5.1 | Como `admin`, pulse "Editar" en `ltorres`. | El nombre de usuario se muestra pero no se puede cambiar. Se pueden cambiar el nombre completo y el rol. |
| 5.2 | Cambie el nombre completo, por ejemplo agregando un segundo apellido, y pulse "Guardar cambios". | Se muestra "Se guardaron los cambios" y la lista muestra el nombre nuevo. |
| 5.3 | En la ventana de incógnito, ingrese con `ltorres` / `Propia2026` y déjela abierta. Como `admin`, pulse "Desactivar" en `ltorres`. | Se pide confirmación antes de desactivar. |
| 5.4 | Confirme con "Desactivar cuenta". | La fila de `ltorres` queda como **Inactiva** y conserva todos sus datos. |
| 5.5 | En la ventana de Luis, pulse cualquier opción del menú. | Su sesión se cierra con el aviso de que la cuenta fue desactivada. |
| 5.6 | Intente ingresar otra vez con `ltorres` / `Propia2026`. | No entra. Se indica que la cuenta está desactivada y que debe comunicarse con el Administrador. |
| 5.7 | Como `admin`, pulse "Reactivar" en `ltorres` y confirme. Luego ingrese con `ltorres` en la otra ventana. | La cuenta vuelve a estar activa y Luis entra con su mismo rol y menú. |
| 5.8 | Con la sesión de Luis abierta, cambie como `admin` el rol de `ltorres` a **Director**. Luego, en la ventana de Luis, pulse Inicio. | El menú de Luis cambia al del Director sin que tenga que volver a ingresar. Al terminar, devuelva su rol a **Consulta interna**. |
| 5.9 | Como `admin`, pulse "Desactivar" en su propia cuenta, `admin`, y confirme. | No se permite: "No puede desactivar su propia cuenta". Pulse "Cancelar". |
| 5.10 | Revise las acciones de cualquier fila. | No existe ninguna opción para eliminar cuentas. |

---

## 6. HU06: Registrar la billetera del director y su rol de firmante (DRA-17)

**Objetivo:** comprobar que el Administrador registra una billetera válida para el director. También que le otorga y le revoca el rol de firmante en la blockchain, confirmándolo con su propia billetera (MetaMask), y que el estado mostrado sale de la blockchain.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 6.1 | Como `admin`, entre a **Billetera del director**. | Se lista la cuenta con rol Director, `cmendoza`, con "Sin billetera". También se muestra la red y la dirección del contrato. Solo aparecen cuentas con rol Director. |
| 6.2 | Pulse "Registrar billetera" en `cmendoza`. Escriba `0x12345` y pulse "Guardar billetera". | No se guarda. Se indica que la dirección debe tener 0x seguido de 40 caracteres hexadecimales. |
| 6.3 | Escriba la dirección del director que le entregó el equipo, pero cambie una sola letra minúscula a mayúscula, como si fuera un error de tipeo. | No se guarda. Se indica que la suma de verificación (EIP-55) no coincide: detecta el error de tipeo. |
| 6.4 | Escriba la dirección de la billetera del Administrador del contrato. | No se guarda. Se indica que es administradora del contrato: quien administra los permisos no puede firmar. |
| 6.5 | Escriba la dirección correcta del director y guarde. | La fila muestra la dirección y "Sin rol de firmante". |
| 6.6 | En MetaMask, seleccione la **segunda cuenta**, la que no administra el contrato. Pulse "Otorgar rol de firmante" y luego "Conectar billetera y continuar". | La plataforma indica que esa billetera no es administradora del contrato. No se envía nada a MetaMask. Pulse "Cancelar". |
| 6.7 | En MetaMask, cambie a la cuenta del **Administrador del contrato**. Pulse otra vez "Otorgar rol de firmante" y luego "Conectar billetera y continuar". | Si MetaMask no tiene la red de la plataforma, la plataforma propone agregarla: acéptelo. La ventana muestra la billetera del Administrador, la red y el costo "Sin costo". |
| 6.8 | Pulse "Confirmar en la billetera" y apruebe en MetaMask. | Se muestra "Rol de firmante otorgado" y que Carlos ya puede firmar documentos con su billetera. Al pulsar "Listo", la fila muestra **✓ Firmante activo**. |
| 6.9 | Pulse "Cambiar billetera" en `cmendoza`, escriba otra dirección cualquiera y guarde. | No se permite mientras tenga el rol de firmante: se indica que lo revoque antes de cambiar la billetera. Pulse "Cancelar". |
| 6.10 | Pulse "Revocar rol de firmante". | Se pide confirmación, con el aviso de que los documentos firmados antes siguen siendo válidos. |
| 6.11 | Pulse "Conectar billetera y continuar", luego "Confirmar en la billetera", y apruebe en MetaMask. | Se muestra "Rol de firmante revocado". Al pulsar "Listo", la fila muestra "Sin rol de firmante". |
| 6.12 | Vaya a Usuarios y vuelva a Billetera del director. | El estado sigue siendo "Sin rol de firmante": se lee de la blockchain, no de lo que recuerda el navegador. |
| 6.13 | En la ventana de incógnito, ingrese con `cmendoza` / `OtraPropia26`. | Su menú no incluye "Billetera del director": solo el Administrador la ve. |

Que los documentos firmados antes de la revocación sigan siendo válidos se comprueba con documentos reales en el Sprint 3 (HU16–HU18), cuando existan las firmas. Aquí se valida el aviso y que el contrato solo quita el permiso de ahí en adelante.

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 1. Si nota que falta, no es una observación:

- **Las pantallas de documentos** (Mis documentos, Nuevo documento, Por revisar, Documentos firmados, Buscar documentos) muestran "Se habilita en el Sprint N". Llegan desde el Sprint 2.
- **La pantalla para consultar el historial de cada cuenta** llega en el Sprint 6. El historial ya se guarda: creación, cambios, desactivación, bloqueo, contraseñas y billetera.
- **Recuperar la contraseña por correo** no está en los requerimientos: la restablece el Administrador.

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-12 a DRA-17):

- **Si todo se vio como se espera,** deje el comentario `Aprobado` y mueva el ticket a **Listo**.
- **Si algo no coincide,** deje el comentario `Observado` con:
  - el número de paso;
  - lo que vio;
  - lo que esperaba.

  El ticket queda en "En revisión" y el equipo carga el ajuste para el Sprint 2.
- **Si tiene un cambio de criterio** (por ejemplo, otro nombre de área), indíquelo en el comentario aunque apruebe. Se registra como cambio para el siguiente Sprint.

Las decisiones se recogen también en el acta de la [revisión del Sprint 1](revision.md).
