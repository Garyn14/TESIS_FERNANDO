# Historias de usuario

**Plataforma con Blockchain para la emisión y verificación de certificados y constancias, DRA Satipo.**
Fuente: sección 3.2.3 de la tesis (Tablas 17 a 23), con los puntos y el sprint de la Tabla 25. Son 30 historias y 156 puntos en total.

| Épica | HU | Sprint | Puntos |
|---|---|---|---|
| E1 Gestión de usuarios, roles y áreas | HU01–HU06 | 1 | 24 |
| E2 Registro de solicitudes de documentos | HU07–HU09 | 2 | 23 |
| E3 Revisión y autorización de emisión | HU10–HU18 | 3 y 4 | 58 |
| E4 Verificación pública de autenticidad | HU19–HU21 | 5 | 16 |
| E5 Consulta y trazabilidad interna | HU22–HU25 | 6 | 13 |
| E6 Notificaciones | HU26–HU28 | 6 | 6 |
| E7 Anulación y reemisión | HU29–HU30 | 4 | 16 |

---

## E1: Gestión de usuarios, roles y áreas

**Objetivo:** Controlar quién accede a la plataforma y qué acciones puede realizar.
**Requerimientos:** RF01–RF09 · **Sprint:** 1 · **Fuente:** Tabla 17 de la tesis.

> RF09 (inicialización del sistema) no tiene historia de usuario: es una tarea técnica del Sprint 0.

---

### HU01: Crear cuentas de usuario

**Como** Administrador, **quiero** crear cuentas de usuario y asignarles un rol, **para** controlar quién accede a la plataforma.

**Contexto**

Hoy la agencia no tiene un registro de quién puede emitir, firmar o consultar documentos. Con esta historia, el Administrador da de alta al personal autorizado y define con el rol qué puede hacer cada persona (RF01, RF04). Es la primera historia del Sprint 1, y HU02 a HU06 se construyen sobre ella.

La primera cuenta de Administrador ya la crea el procedimiento de inicialización (RF09, DRA-47). A partir de esa cuenta se crean todas las demás.

**Datos de la cuenta**

| Campo | Obligatorio | Regla |
|---|---|---|
| Nombre de usuario | Sí | De 4 a 30 caracteres: letras minúsculas sin tildes, números, punto o guion bajo, y debe empezar con una letra (ej.: jperez, m.quispe). Es único sin distinguir mayúsculas y no se puede cambiar después. |
| Nombre completo | Sí | De 3 a 150 caracteres. Es el nombre que aparece en el encabezado y en el historial. |
| Rol | Sí | Uno solo: Administrador, Área encargada, Director o Consulta interna. |
| Contraseña temporal | Sí | De 8 a 20 caracteres (RNF02). La define el Administrador y se la entrega a la persona. |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Cada cuenta tiene un único rol.
- [ ] El nombre de usuario no se repite.
- [ ] La cuenta queda activa al crearse.
- [ ] Solo un usuario con el permiso USUARIOS_GESTIONAR (rol Administrador) puede crear cuentas. Cualquier otro rol recibe "acceso denegado" (403), y sin sesión se responde 401 (RF04).
- [ ] Si el nombre de usuario ya existe, incluso con otras mayúsculas (JPerez y jperez), la cuenta no se crea y se muestra "El nombre de usuario ya está registrado".
- [ ] Si algún dato no cumple las reglas de la tabla, la cuenta no se crea y se indica qué campo corregir.
- [ ] La contraseña se guarda con hash adaptativo (BCrypt), nunca en claro, y no se devuelve en ninguna respuesta ni aparece en los registros (RNF02).
- [ ] La cuenta queda marcada con contraseña temporal: la persona debe cambiarla en su primer inicio de sesión (RF03; el cambio se implementa en HU04).
- [ ] Se guarda quién creó la cuenta y cuándo, como base del historial de auditoría (RF01).
- [ ] La pantalla Usuarios lista las cuentas con nombre de usuario, nombre completo, rol, estado y fecha de creación, y la cuenta nueva aparece al guardarla.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Editar y desactivar cuentas | HU02 |
| Inicio de sesión, menú por rol, bloqueo tras 3 intentos y sesión de 30 minutos | HU03 |
| Cambio obligatorio de la contraseña temporal y restablecimiento | HU04 |
| Área del usuario del Área encargada | HU05, que agrega el campo Área a este mismo formulario y lo vuelve obligatorio para ese rol |
| Billetera del director | HU06 |

**Notas técnicas**

- API: POST /api/usuarios (crear) y GET /api/usuarios (listar), protegidas con el permiso USUARIOS_GESTIONAR.
- Migración V4: agrega creado_por a la tabla usuario y amplía la unicidad del nombre de usuario para que no distinga mayúsculas.
- Interfaz: el prototipo no incluye el rol Administrador. La pantalla Usuarios se diseña con la guía visual del prototipo (colores, tablas y formularios).
- Hasta que esté HU03, las pruebas de la API usan un usuario simulado con el permiso. La prueba de punta a punta desde el login se completa con HU03 en este mismo sprint.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 1 | RF01 |

### HU02: Editar o desactivar cuentas

**Como** Administrador, **quiero** editar o desactivar cuentas, **para** mantener actualizado el personal autorizado.

**Contexto**

El personal de la agencia cambia: hay traslados, cambios de función, fin de contrato o vacaciones largas. El Administrador tiene que poder corregir los datos de una cuenta, cambiarle el rol y quitarle el acceso sin borrarla. RF01 exige que la desactivación no elimine la cuenta ni sus acciones del historial de auditoría, porque los documentos que esa persona registró o firmó tienen que seguir mostrando quién lo hizo.

Esta historia continúa HU01 (DRA-12) y usa la misma pantalla Usuarios.

**Qué se puede cambiar**

| Dato | ¿Se edita? | Motivo |
|---|---|---|
| Nombre completo | Sí, de 3 a 150 caracteres | Corrección de datos |
| Rol | Sí, uno solo de los cuatro | Cambio de función |
| Nombre de usuario | No | Identifica a la persona en el historial (regla de HU01) |
| Contraseña | No, aquí no | El restablecimiento es de HU04 |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La desactivación no elimina la cuenta ni su historial.
- [ ] Un usuario desactivado no puede iniciar sesión.
- [ ] El Administrador puede editar el nombre completo y el rol de una cuenta. El nombre de usuario se muestra pero no se puede cambiar.
- [ ] Desactivar pide confirmación. La cuenta queda como Inactiva en la lista y conserva todos sus datos.
- [ ] Una cuenta inactiva se puede reactivar, también con confirmación, y vuelve a tener acceso con su mismo rol.
- [ ] No existe ninguna opción para eliminar cuentas, ni en la pantalla ni en la API.
- [ ] El Administrador no puede desactivar su propia cuenta ni cambiarse el rol, para no quedarse sin acceso.
- [ ] Siempre debe quedar al menos un Administrador activo: no se puede desactivar ni cambiar de rol al último.
- [ ] Cada creación, edición, desactivación y reactivación queda registrada en el historial de la cuenta, con quién la hizo, cuándo y qué cambió (por ejemplo, "Rol: Director → Consulta interna").
- [ ] Solo un usuario con el permiso USUARIOS_GESTIONAR puede editar, desactivar o reactivar. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Rechazar el inicio de sesión de una cuenta inactiva y cerrar su sesión abierta | HU03. Esta historia deja la cuenta marcada como inactiva; HU03 aplica la regla en el login y la prueba de punta a punta del segundo criterio se hace allí |
| Restablecer la contraseña | HU04 |
| Cambiar el área de un usuario del Área encargada | HU05 |
| Revocar el rol de firmante si se desactiva al Director | HU06 |
| Pantalla para consultar el historial de una cuenta | Sprint 6, junto con la auditoría interna (E5) |

**Notas técnicas**

- API: PUT /api/usuarios/{id} (editar), POST /api/usuarios/{id}/desactivar y POST /api/usuarios/{id}/reactivar.
- Migración V5: tabla usuario_historial, cargada con el evento de creación de las cuentas que ya existen.
- Los dos bloqueos de seguridad (la propia cuenta y el último Administrador) se validan en el servidor, no solo en la pantalla.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 2 | 1 | RF01 |

### HU03: Iniciar sesión según el rol

**Como** usuario del sistema, **quiero** iniciar sesión con mi usuario y contraseña, **para** acceder solo a las funciones de mi rol.

**Contexto**

Es la puerta de entrada a la plataforma. Hay un único formulario de inicio de sesión para todos los roles (RF02). El rol y los permisos salen de la cuenta autenticada, y con ellos el menú muestra solo lo que cada persona puede usar (RF04). Las reglas de seguridad de la contraseña y de la sesión vienen de RNF02.

Con esta historia, HU01 y HU02 se pueden usar y probar de punta a punta desde el login, y una cuenta desactivada (HU02) deja de poder entrar.

**Menú según el permiso**

Cada opción exige un permiso. Los permisos de cada rol se configuran en la base de datos (DRA-47). Las opciones cuyas pantallas todavía no existen se muestran con el aviso "Se habilita en el Sprint N", para que el menú de cada rol ya quede completo y se pueda validar.

| Opción | Permiso | Rol con el permiso hoy | Pantalla |
|---|---|---|---|
| Inicio | CUENTA_PROPIA | Todos | Bienvenida con el nombre y el rol |
| Usuarios | USUARIOS_GESTIONAR | Administrador | HU01, HU02 |
| Billetera del director | BILLETERA_GESTIONAR | Administrador | HU06 (Sprint 1) |
| Mis documentos | DOCUMENTO_VER_AREA | Área encargada | Sprint 2 |
| Nuevo documento | DOCUMENTO_REGISTRAR | Área encargada | HU07–HU09 (Sprint 2) |
| Por revisar | DOCUMENTO_REVISAR | Director | HU10 (Sprint 3) |
| Documentos firmados | DOCUMENTO_VER_FIRMADOS | Director | Sprint 3 |
| Buscar documentos | DOCUMENTO_BUSCAR | Consulta interna | HU22 (Sprint 6) |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El menú muestra solo las vistas permitidas.
- [ ] Tres intentos fallidos bloquean la cuenta durante una hora.
- [ ] La sesión expira tras 30 minutos de inactividad.
- [ ] El inicio de sesión es único para todos los roles, con usuario y contraseña. El usuario no distingue mayúsculas (JPerez entra como jperez).
- [ ] Si el usuario no existe o la contraseña es incorrecta, se muestra el mismo mensaje, "Usuario o contraseña incorrectos", sin revelar cuál de los dos falló, y el usuario escrito se conserva.
- [ ] Los intentos fallidos se cuentan seguidos: un ingreso correcto vuelve el contador a cero. Al tercer intento fallido, la cuenta se bloquea por una hora y se muestra hasta qué hora. Mientras está bloqueada no se acepta ni la contraseña correcta.
- [ ] Una cuenta desactivada no puede iniciar sesión. Si la contraseña es correcta, se indica que la cuenta está desactivada y que debe comunicarse con el Administrador.
- [ ] El servidor valida el permiso en cada solicitud con los datos actuales de la cuenta. Si el Administrador desactiva una cuenta o le cambia el rol, el cambio rige desde la siguiente solicitud, aunque la persona tenga la sesión abierta (RF04).
- [ ] Al expirar la sesión, la siguiente acción lleva al inicio de sesión con el aviso "Su sesión expiró por inactividad".
- [ ] El encabezado muestra el nombre y el rol de la persona, y el botón "Cerrar sesión" termina la sesión en el servidor.
- [ ] Escribir directamente la dirección de una pantalla sin el permiso no la muestra: se indica "No tiene permiso para ver esta sección".
- [ ] La sesión usa una cookie HttpOnly con protección CSRF, y el identificador de sesión cambia al iniciar sesión.
- [ ] El bloqueo de una cuenta queda en su historial (evento Bloqueada).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Obligar a cambiar la contraseña temporal en el primer ingreso | HU04. Esta historia ya informa al frontend que la contraseña es temporal |
| Desbloquear una cuenta antes de la hora: el Administrador restablece la contraseña | HU04 |
| Reglas de control interno de RF05 (el Área encargada solo ve su área; quien registra no firma) | HU05 y HU11. Se aplican en el código de cada servicio, no en el login |
| Auditoría de todos los inicios de sesión | Sprint 6 (E5) |

**Notas técnicas**

- API: POST /api/sesion (iniciar), GET /api/sesion (sesión actual) y DELETE /api/sesion (cerrar).
- Sesión del servidor (Spring Security) con tiempo de inactividad de 30 minutos. Cookie de sesión HttpOnly y SameSite=Lax; token CSRF en la cookie XSRF-TOKEN.
- Migración V6: intentos_fallidos y bloqueada_hasta en la tabla usuario, y el evento BLOQUEADA en el historial.
- Para no revelar qué usuarios existen, cuando el usuario no existe igual se calcula un hash, así la respuesta tarda lo mismo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 1 | RF02, RF04, RF05 |

### HU04: Cambiar o restablecer la contraseña

**Como** usuario del sistema, **quiero** cambiar mi contraseña y, ante un olvido, que el Administrador la restablezca, **para** mantener el control de mi acceso.

**Contexto**

Toda cuenta nueva nace con una contraseña temporal que define el Administrador (HU01). RF03 exige que la persona la cambie en su siguiente inicio de sesión, para que solo ella conozca su contraseña. Además, cada usuario puede cambiar su contraseña cuando quiera. Si la olvida, o si su cuenta quedó bloqueada por intentos fallidos (HU03), el Administrador le asigna una nueva contraseña temporal.

Las reglas de la contraseña vienen de RNF02: de 8 a 20 caracteres y guardada con hash adaptativo.

**Criterios de aceptación**

Los dos primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El cambio exige la contraseña actual.
- [ ] La contraseña temporal debe cambiarse en el siguiente inicio de sesión.
- [ ] Con contraseña temporal, al iniciar sesión solo se muestra la pantalla "Cambie su contraseña"; el menú y las demás pantallas no están disponibles hasta cambiarla. El servidor rechaza cualquier otra solicitud con "Debe cambiar su contraseña temporal antes de continuar" (403), aunque se llame a la API directamente.
- [ ] Cualquier usuario puede cambiar su contraseña cuando quiera desde la opción "Cambiar contraseña" del encabezado.
- [ ] La contraseña nueva debe tener de 8 a 20 caracteres, ser distinta de la actual y escribirse dos veces iguales. Si la contraseña actual es incorrecta, se indica en ese campo.
- [ ] Al cambiarla, las demás sesiones abiertas de esa cuenta (en otro equipo o navegador) se cierran; la sesión desde la que se cambió sigue activa.
- [ ] El Administrador restablece la contraseña desde la pantalla Usuarios con una contraseña temporal de 8 a 20 caracteres, que puede escribir o generar. Al confirmar, se muestra la contraseña para entregarla a la persona.
- [ ] Restablecer desbloquea la cuenta si estaba bloqueada por intentos fallidos, obliga a cambiar la contraseña en el siguiente ingreso y cierra las sesiones abiertas de esa cuenta con el aviso "Su contraseña fue restablecida".
- [ ] El Administrador no puede restablecer su propia contraseña: debe usar "Cambiar contraseña", que exige la actual.
- [ ] El cambio y el restablecimiento quedan en el historial de la cuenta, con quién lo hizo y cuándo, sin guardar ninguna contraseña.
- [ ] Solo un usuario con el permiso USUARIOS_GESTIONAR puede restablecer contraseñas. Cambiar la propia exige el permiso CUENTA_PROPIA (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Recuperar la contraseña por correo, sin el Administrador | No está en RF03: la tesis define que el Administrador la restablece |
| Reglas de complejidad más allá de la longitud (mayúsculas, símbolos) | RNF02 solo fija la longitud. Se puede agregar si el PO lo pide |
| Caducidad periódica de la contraseña | No está en los requerimientos |

**Notas técnicas**

- API: PUT /api/sesion/contrasena (cambio propio) y POST /api/usuarios/{id}/restablecer-contrasena (Administrador).
- Migración V7: columna contrasena_cambiada_en en usuario y eventos CONTRASENA_CAMBIADA y CONTRASENA_RESTABLECIDA en el historial.
- Las sesiones abiertas antes del último cambio o restablecimiento se cierran en su siguiente solicitud, porque la cuenta se valida en cada solicitud (HU03).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 1 | RF03 |

### HU05: Asignar el área a un usuario

**Como** Administrador, **quiero** asignar a cada usuario del Área encargada el área a la que pertenece, **para** que solo gestione los documentos que le corresponden.

**Contexto**

En la agencia, cada área emite ciertos tipos de documento (RF06). RF05 fija una regla de control interno que se aplica sin importar cómo se configuren los permisos: un usuario del Área encargada solo accede a los documentos de su área. Para eso, cada cuenta de ese rol necesita un área asignada.

Áreas y tipos de documento que emite cada una (catálogo cargado en DRA-47, tomado del prototipo; **los nombres están pendientes de validar con el PO**):

| Área | Tipos de documento |
|---|---|
| Área de Capacitación | Certificado de Capacitación, Certificado de Reconocimiento |
| Área de Desarrollo Agrario | Constancia de Productor Activo |
| Área de Administración | Certificado de Prácticas, Certificado de Trabajo |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El área es obligatoria para ese rol.
- [ ] El usuario solo ve los documentos y tipos de documento de su área.
- [ ] Al crear o editar una cuenta con el rol Área encargada, el formulario muestra el campo Área con las áreas activas y los tipos de documento que emite cada una. Sin área, la cuenta no se guarda y se indica "Seleccione el área de la persona".
- [ ] Para los demás roles el campo Área no aparece y la cuenta queda sin área. Si una cuenta deja de ser del Área encargada, su área se quita.
- [ ] La lista de Usuarios muestra el área junto al rol. Si una cuenta del Área encargada no tiene área (por ejemplo, creada antes de esta historia), se marca "Sin área asignada".
- [ ] El encabezado muestra el área de la persona junto a su rol, por ejemplo "Área encargada – Área de Capacitación", como en el prototipo.
- [ ] En Inicio, el usuario del Área encargada ve los tipos de documento que puede emitir su área. Sin área asignada, ve un aviso para comunicarse con el Administrador.
- [ ] La consulta de tipos de documento para registrar devuelve solo los del área del usuario, aunque se llame a la API directamente. La regla se aplica en el servidor, en un solo componente que reutilizarán las historias de documentos (RF05).
- [ ] El cambio de área queda en el historial de la cuenta (por ejemplo, "Área: Área de Capacitación → Área de Administración").
- [ ] Si el Administrador cambia el área de una persona con sesión abierta, el cambio rige desde su siguiente pantalla (HU03).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Filtrar los documentos registrados por área (Mis documentos) | Sprint 2, cuando existan los documentos (HU07–HU09). Usará el mismo componente de la regla RF05 |
| Crear, renombrar o desactivar áreas desde la pantalla | No está en RF06. Las áreas se cambian con una migración, como las demás tablas de catálogo |
| Regla "quien registra no firma" (RF05) | HU11 |

**Notas técnicas**

- API: GET /api/areas (áreas activas con sus tipos de documento, para el formulario) y GET /api/tipos-documento (tipos que el usuario puede registrar). El área va en POST y PUT /api/usuarios.
- No requiere migración: la columna usuario.area_id y la tabla area_tipo_documento existen desde V2.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 1 | RF05, RF06 |

### HU06: Registrar la billetera del director y su rol de firmante

**Como** Administrador, **quiero** registrar la billetera del director y otorgarle el rol de firmante, **para** habilitar su firma en la plataforma.

**Criterios de aceptación**
- [ ] Se valida el formato y la unicidad de la billetera.
- [ ] El otorgamiento se confirma con la billetera de administrador del contrato.
- [ ] La revocación no invalida los documentos firmados antes.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 1 | RF07, RF08 |

---

## E2: Registro de solicitudes de documentos

**Objetivo:** Generar los documentos a partir de plantillas, de forma individual o por lista.
**Requerimientos:** RF10–RF20 · **Sprint:** 2 · **Fuente:** Tabla 18 de la tesis.

---

### HU07: Seleccionar el tipo de documento

**Como** Área encargada, **quiero** seleccionar el tipo de documento a emitir, **para** acceder a su formulario.

**Criterios de aceptación**
- [ ] Solo se listan los tipos asignados al área.
- [ ] Los tipos de oficio abren el registro por lista.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 2 | 2 | RF10 |

### HU08: Registrar un documento a solicitud de parte

**Como** Área encargada, **quiero** completar y enviar el formulario de un documento a solicitud de parte, **para** dejarlo pendiente de revisión.

**Criterios de aceptación**
- [ ] Se exige el número de expediente.
- [ ] Se validan los campos antes del envío.
- [ ] Se muestra una vista previa.
- [ ] Al enviar, se genera el código de verificación y el documento queda en estado Pendiente, sin posibilidad de edición.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 2 | RF11, RF12, RF16–RF18, RF20 |

### HU09: Registrar una emisión por lista

**Como** Área encargada, **quiero** registrar una emisión por lista con los datos del evento y la relación de beneficiarios, **para** generar todos los certificados de oficio de una sola vez.

**Criterios de aceptación**
- [ ] La relación se carga de forma manual o desde la plantilla Excel.
- [ ] Cada fila se valida y sus errores se señalan.
- [ ] La vista previa muestra un certificado de ejemplo y la relación completa.
- [ ] Al enviar, se crea un documento por beneficiario, agrupados en un lote.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 2 | RF13–RF19 |

---

## E3: Revisión y autorización de emisión

**Objetivo:** Permitir que el director revise, observe, rechace y firme los documentos sin depender de su presencia en la sede.
**Requerimientos:** RF21–RF35 · **Sprints:** 3 y 4 · **Fuente:** Tabla 19 de la tesis.

---

### HU10: Ver los documentos pendientes de revisión

**Como** director, **quiero** ver los documentos pendientes de revisión, **para** atenderlos en orden.

**Criterios de aceptación**
- [ ] Se ordenan del más antiguo al más reciente.
- [ ] Los lotes aparecen como un solo elemento.
- [ ] Se registra qué documentos fueron revisados.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 3 | RF21, RF22 |

### HU11: Firmar uno o varios documentos

**Como** director, **quiero** firmar uno o varios documentos revisados en una sola operación, **para** aprobar su emisión sin estar en la sede.

**Criterios de aceptación**
- [ ] Solo se firman documentos revisados.
- [ ] Se verifica la billetera y la red antes de firmar.
- [ ] Una selección de más de 50 documentos se divide en varias transacciones.
- [ ] Un documento que falla vuelve a Pendiente sin detener al resto.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF23, RF28–RF31 |

### HU12: Revisar y firmar un lote

**Como** director, **quiero** revisar y firmar un lote como una unidad, **para** aprobar los certificados de un evento sin abrirlos uno por uno.

**Criterios de aceptación**
- [ ] Revisar el certificado de ejemplo y la relación cuenta como revisión de todo el lote.
- [ ] Se puede observar o rechazar beneficiarios individuales o el lote completo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 3 | RF22, RF27 |

### HU13: Observar un documento

**Como** director, **quiero** observar un documento indicando un motivo, **para** que el área lo corrija.

**Criterios de aceptación**
- [ ] El motivo es obligatorio.
- [ ] El documento vuelve al área encargada.
- [ ] La observación queda en el historial.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF25 |

### HU14: Rechazar un documento

**Como** director, **quiero** rechazar un documento indicando un motivo, **para** concluir un trámite que no debe emitirse.

**Criterios de aceptación**
- [ ] El motivo es obligatorio.
- [ ] El rechazo es definitivo.
- [ ] En los documentos a solicitud de parte se avisa a Mesa de Partes.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF26 |

### HU15: Corregir y reenviar un documento observado

**Como** Área encargada, **quiero** corregir un documento observado y reenviarlo, **para** continuar el trámite sin iniciar uno nuevo.

**Criterios de aceptación**
- [ ] Se muestra el motivo de la observación.
- [ ] Se aplican las mismas validaciones del registro.
- [ ] El documento vuelve a Pendiente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 4 | RF20, RF25 |

### HU16: Generar el PDF final y su hash

**Como** sistema, **quiero** generar el PDF final y calcular su hash al iniciarse la firma, **para** que lo registrado coincida con lo que se imprime.

**Criterios de aceptación**
- [ ] El PDF incluye la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.
- [ ] El hash se calcula con SHA-256.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30, RF36 |

### HU17: Almacenar el PDF en IPFS

**Como** sistema, **quiero** almacenar el PDF final en la red IPFS privada, **para** conservar el original para su verificación y reimpresión.

**Criterios de aceptación**
- [ ] Se guarda el identificador (CID) del archivo.
- [ ] Si el almacenamiento falla, el documento sale de la operación, vuelve a Pendiente y se registra el error.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30 |

### HU18: Sincronizar los estados con la blockchain

**Como** sistema, **quiero** sincronizar el estado de los documentos con la blockchain, **para** que ninguna firma o anulación quede sin reflejarse.

**Criterios de aceptación**
- [ ] Se leen los eventos del smart contract y se reanuda desde el último bloque procesado.
- [ ] Los documentos detenidos en proceso de firma se corrigen.
- [ ] Un código ya registrado no se registra de nuevo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF32–RF35 |

---

## E4: Verificación pública de autenticidad

**Objetivo:** Permitir que cualquier tercero compruebe la autenticidad de un documento en segundos.
**Requerimientos:** RF36–RF41 · **Sprint:** 5 · **Fuente:** Tabla 20 de la tesis.

---

### HU19: Verificar mediante el código QR

**Como** entidad externa, **quiero** escanear el código QR de un documento, **para** comprobar su autenticidad y ver el documento completo.

**Criterios de aceptación**
- [ ] No se requiere registro.
- [ ] El resultado se muestra en menos de dos segundos.
- [ ] Si el documento es válido, se muestra completo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 5 | RF37, RF39 |

### HU20: Verificar mediante el código de verificación

**Como** entidad externa, **quiero** ingresar el código de verificación de un documento, **para** comprobar su autenticidad cuando no puedo escanear el código QR.

**Criterios de aceptación**
- [ ] Se valida el formato del código.
- [ ] Se muestran solo el tipo de documento, el nombre del titular, la fecha de emisión y el estado.
- [ ] Se limita el número de consultas por dirección IP.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 5 | RF37, RF40 |

### HU21: Comprobar la autenticidad del documento

**Como** sistema, **quiero** comprobar la autenticidad comparando el documento almacenado con su registro en la blockchain, **para** entregar un resultado confiable.

**Criterios de aceptación**
- [ ] La consulta al smart contract es de solo lectura.
- [ ] Se recalcula el hash del PDF y se compara con el registrado.
- [ ] El resultado es Válido, Anulado o No válido.
- [ ] En un documento anulado se informa la fecha y si existe una versión corregida.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 5 | RF38, RF41 |

---

## E5: Consulta y trazabilidad interna

**Objetivo:** Ubicar cualquier documento, conocer su historial y emitir duplicados sin reiniciar el trámite.
**Requerimientos:** RF42–RF45 · **Sprint:** 6 · **Fuente:** Tabla 21 de la tesis.

---

### HU22: Buscar documentos

**Como** personal de Mesa de Partes, **quiero** buscar documentos por nombre, DNI, código de verificación o número de expediente, **para** ubicarlos con rapidez.

**Criterios de aceptación**
- [ ] La búsqueda por nombre admite coincidencias parciales.
- [ ] Los lotes se despliegan en sus certificados.
- [ ] Si no hay resultados, se informa con un mensaje.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF42 |

### HU23: Ver el estado de un documento

**Como** personal de Mesa de Partes, **quiero** ver el estado y los datos de un documento, **para** informar al ciudadano sobre su trámite.

**Criterios de aceptación**
- [ ] Se muestra uno de los seis estados posibles junto con los datos básicos del documento.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 2 | 6 | RF43 |

### HU24: Consultar el historial y la auditoría

**Como** personal de Mesa de Partes, **quiero** consultar el historial y el detalle técnico de auditoría de un documento, **para** demostrar su trazabilidad.

**Criterios de aceptación**
- [ ] Cada evento muestra fecha, hora y responsable.
- [ ] El detalle técnico aparece plegado por defecto.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 5 | 6 | RF44 |

### HU25: Descargar o imprimir un documento

**Como** personal de Mesa de Partes, **quiero** descargar o imprimir un documento firmado, **para** entregarlo o emitir un duplicado sin reiniciar el trámite.

**Criterios de aceptación**
- [ ] No se requiere una nueva firma.
- [ ] Cada impresión queda registrada en el historial del documento.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF45 |

---

## E6: Notificaciones

**Objetivo:** Informar a cada rol de los eventos que requieren su intervención.
**Requerimientos:** RF46–RF48 · **Sprint:** 6 · **Fuente:** Tabla 22 de la tesis.

---

### HU26: Aviso de documento pendiente al director

**Como** director, **quiero** recibir un aviso cuando un documento queda pendiente de mi revisión, **para** atenderlo a tiempo.

**Criterios de aceptación**
- [ ] El aviso aparece dentro de la plataforma y abre el documento o lote correspondiente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF46 |

### HU27: Avisos de resultado al Área encargada

**Como** Área encargada, **quiero** recibir un aviso cuando un documento es firmado, observado, rechazado o anulado, **para** actuar en consecuencia.

**Criterios de aceptación**
- [ ] El aviso incluye el motivo cuando corresponde y abre el documento.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF47 |

### HU28: Avisos de entrega y rechazo a Mesa de Partes

**Como** personal de Mesa de Partes, **quiero** recibir un aviso cuando un documento está listo para su entrega o es rechazado, **para** imprimirlo o comunicar el rechazo al solicitante.

**Criterios de aceptación**
- [ ] El aviso de rechazo incluye el motivo y el número de expediente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF48 |

---

## E7: Anulación y reemisión

**Objetivo:** Corregir documentos ya emitidos sin perder la trazabilidad del original.
**Requerimientos:** RF49–RF51 · **Sprint:** 4 · **Fuente:** Tabla 23 de la tesis.

---

### HU29: Anular un documento firmado

**Como** director, **quiero** anular un documento firmado indicando un motivo, **para** que deje de ser válido cuando no debió emitirse.

**Criterios de aceptación**
- [ ] Solo se anulan documentos firmados.
- [ ] El motivo es obligatorio.
- [ ] La anulación se confirma desde la billetera del director.
- [ ] El portal público muestra el documento como anulado.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF49 |

### HU30: Reemitir un documento con datos corregidos

**Como** Área encargada, **quiero** reemitir un documento firmado con los datos corregidos, **para** reemplazarlo sin reiniciar el trámite.

**Criterios de aceptación**
- [ ] El formulario se precarga con los datos del original.
- [ ] El motivo de la reemisión es obligatorio.
- [ ] El director visualiza los cambios respecto al original.
- [ ] Al firmarse, el original se anula en la misma transacción.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF50, RF51 |
