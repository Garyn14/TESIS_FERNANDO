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
| Sprint 7: propuestas del equipo (fuera del backlog original) | DRA-58 a DRA-62 | 7 | 16 |

> **Nombres de los roles desde el Sprint 7 (DRA-59).** Las historias HU01–HU30 conservan los nombres de la tesis. En la plataforma, **"Área encargada"** se llama **"Administrador de área"** y **"Consulta interna"** se llama **"Mesa de Partes"**. Los códigos internos (`AREA_ENCARGADA`, `CONSULTA_INTERNA`) no cambian.

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

**Contexto**

El director firma los documentos desde su propia billetera digital (MetaMask), sin que el servidor guarde ninguna clave privada (RNF05). Para que su firma valga, el smart contract tiene que reconocer esa billetera como **firmante**. Esta historia cubre los dos pasos previos a la primera firma:

1. **RF07:** el Administrador registra en la plataforma la dirección de la billetera del director.
2. **RF08:** el Administrador otorga (o revoca) el rol de firmante a esa billetera en el smart contract, confirmándolo con su propia billetera de administrador del contrato.

Es la primera historia que usa la blockchain. Por eso incluye el primer smart contract del proyecto, **RegistroDocumentos**, con el control de acceso por roles. Las funciones para registrar y anular documentos se agregan a ese mismo contrato en las historias de firma (HU16–HU18).

**Quién puede hacer qué en el contrato:**

| Rol en el contrato | Billeteras | Qué puede hacer |
|---|---|---|
| Administrador del contrato | La del Administrador de la plataforma **y** una de respaldo guardada fuera de línea (RNF05) | Otorgar y revocar el rol de firmante |
| Firmante | La del director | Registrar documentos firmados (desde HU17) |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 17 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se valida el formato y la unicidad de la billetera.
- [ ] El otorgamiento se confirma con la billetera de administrador del contrato.
- [ ] La revocación no invalida los documentos firmados antes.
- [ ] La pantalla "Billetera del director" lista las cuentas con rol Director, su billetera y si tiene el rol de firmante. Solo la ve quien tiene el permiso BILLETERA_GESTIONAR (Administrador).
- [ ] La dirección debe tener el formato de Ethereum (0x seguido de 40 caracteres hexadecimales). Si trae mayúsculas y minúsculas, se comprueba su suma de verificación (EIP-55) para detectar errores de tipeo. No puede estar asignada a otra cuenta, sin distinguir mayúsculas.
- [ ] Solo una cuenta con rol Director puede tener billetera registrada.
- [ ] No se puede cambiar la billetera mientras tenga el rol de firmante: primero hay que revocarlo, para que no quede una billetera antigua con permiso de firmar.
- [ ] Para otorgar o revocar, el Administrador conecta su billetera. La plataforma comprueba que esté en la red de la plataforma (y ofrece cambiarla) y que sea administradora del contrato; si no lo es, lo indica sin enviar nada.
- [ ] La operación se firma en el navegador con la billetera del Administrador. El servidor nunca recibe claves privadas (RNF05).
- [ ] Al terminar, el servidor verifica la transacción en la blockchain (que se haya confirmado, que sea del contrato y que corresponda a esa billetera) antes de registrarla en el historial de la cuenta con su identificador de transacción.
- [ ] El estado "Firmante activo" se lee siempre de la blockchain, que es la fuente de verdad (RNF10). Si la blockchain no responde, la pantalla lo indica en lugar de mostrar un estado que podría no ser cierto.
- [ ] Revocar pide confirmación. La revocación solo quita el permiso de firmar de ahí en adelante: el contrato no borra ni modifica nada de lo ya registrado.
- [ ] El contrato no permite que una billetera administradora del contrato sea también firmante (control interno: quien administra los permisos no firma).
- [ ] Al desplegar el contrato, el rol de administrador queda en la billetera del Administrador y en la de respaldo; la cuenta que despliega no queda con ningún rol (RNF05).
- [ ] El contrato está documentado con NatSpec y usa el control de acceso de OpenZeppelin (RNF08), y se prueba en la red simulada de Hardhat y en la red Besu local.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Registrar y anular documentos en el contrato | HU16–HU18 y HU29. Ahí se prueba con documentos reales que una firma anterior sigue siendo válida después de revocar el rol |
| Verificar antes de firmar que la billetera conectada sea la del director (RF29) | HU11 |
| Desplegar el contrato en AWS | DRA-44, para la demo |
| Custodia física de la billetera de respaldo | Procedimiento documentado en plataforma/contracts/README.md; la guarda la institución |

**Notas técnicas**

- Contrato: plataforma/contracts/contracts/RegistroDocumentos.sol (Solidity 0.8.30, OpenZeppelin AccessControl 5.6). Script de despliegue con las direcciones del Administrador y del respaldo.
- API: GET /api/billeteras, PUT /api/billeteras/{idCuenta} (registrar la dirección) y POST /api/billeteras/{idCuenta}/firmante (verificar y registrar una transacción de otorgamiento o revocación). GET /api/blockchain/red da la red y la dirección del contrato al frontend.
- El backend lee el contrato con web3j (eth_call) y nunca envía transacciones.
- Migración V8: columna usuario.billetera (única sin distinguir mayúsculas) y eventos BILLETERA_REGISTRADA, FIRMANTE_OTORGADO y FIRMANTE_REVOCADO.

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


### HU08: Registrar un documento a solicitud de parte

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


### HU09: Registrar una emisión por lista

**Como** Área encargada, **quiero** registrar una emisión por lista con los datos del evento y la relación de beneficiarios, **para** generar todos los certificados de oficio de una sola vez.

**Contexto**

Los certificados de oficio los emite la agencia por iniciativa propia: por ejemplo, los de un taller de capacitación, para todos sus participantes. Hoy se hacen uno por uno. Con esta historia, el Área encargada ingresa una sola vez los datos del evento y la relación de beneficiarios (RF13), a mano o desde una plantilla Excel (RF14). La plataforma valida cada fila (RF15), muestra un certificado de ejemplo con la relación completa y, al enviar, crea un documento por beneficiario agrupados en un lote (RF19). Cada documento recibe su código, su token del QR y el HMAC del DNI, igual que en HU08 (RF16, RF17), y queda Pendiente.

**Datos del evento, por tipo**

| Tipo | Campos | Texto del certificado |
|---|---|---|
| Certificado de Capacitación | Nombre del taller, fecha de inicio, fecha de fin, duración en horas, lugar y área organizadora | "Por haber participado en el taller de capacitación '{taller}', realizado del {fechas} en {lugar}, con una duración de {horas} horas." (texto del prototipo) |
| Certificado de Reconocimiento | Motivo, nombre del evento, fecha, lugar y área organizadora | "En reconocimiento a {motivo}, en el marco de '{evento}', realizado el {fecha} en {lugar}." |

El área organizadora se completa con el área de la persona y se puede cambiar. Las fechas se escriben con el mes en letras, como en el prototipo (del 14 al 16 de setiembre de 2026). **Los campos y los textos están pendientes de validar con el PO.** El de Reconocimiento lo propuse yo, porque el prototipo solo tenía un ejemplo individual.

**Relación de beneficiarios**

Cada fila tiene Nombres, Apellidos y DNI, con las mismas reglas de HU08. Son las columnas del prototipo. **Siguen pendientes de validar con la lista real que se le pidió al PO.** Un lote tiene de 1 a 300 beneficiarios.

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 18 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La relación se carga de forma manual o desde la plantilla Excel.
- [ ] Cada fila se valida y sus errores se señalan.
- [ ] La vista previa muestra un certificado de ejemplo y la relación completa.
- [ ] Al enviar, se crea un documento por beneficiario, agrupados en un lote.
- [ ] El registro por lista sigue los pasos "Datos del evento · Beneficiarios · Vista previa". No se pasa al paso siguiente mientras haya campos con error, y el servidor vuelve a validar todo en la vista previa y en el envío.
- [ ] "Descargar plantilla Excel" baja un archivo .xlsx con las columnas Nombres, Apellidos y DNI, y la columna DNI en formato texto para no perder los ceros iniciales.
- [ ] "Importar desde Excel" agrega a la tabla las filas del archivo. Si el archivo no es la plantilla (otro formato o sin esas columnas), o tiene más de 300 filas, no se importa nada y se indica el motivo.
- [ ] "Agregar beneficiario" agrega una fila vacía. Cada fila se puede editar o eliminar. Sin filas, se muestra "Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno".
- [ ] Cada fila con error se marca en rojo con su mensaje, y arriba se indica cuántos errores hay ("Hay 1 error en la lista. Corríjalo para continuar"). Un DNI repetido en la lista es un error en las dos filas (RF15). Sin errores se indica "N beneficiarios listos". Con errores o con la lista vacía no se puede continuar.
- [ ] La vista previa muestra el certificado del primer beneficiario con la plantilla del tipo y la marca "VISTA PREVIA", y un resumen del lote: cantidad de certificados, evento, fechas y la lista de nombres (RF19). Desde ahí se puede volver sin perder los datos.
- [ ] Enviar pide confirmación ("¿Enviar N certificados a revisión del Director?"). Al confirmar se crea el lote con su número, `Lote AAAA-NNN` (correlativo por año), y un documento Pendiente por beneficiario, cada uno con su propio código, token y HMAC del DNI. Todo se crea o no se crea nada.
- [ ] Mis documentos muestra el lote en una sola fila, con su número, el tipo, la cantidad de beneficiarios, la fecha de envío y el estado. El detalle del lote muestra los datos del evento, el certificado de ejemplo y la lista de documentos con su código, que abre el detalle de cada uno. Nada se puede editar (RF20).
- [ ] Solo se puede registrar un lote de un tipo de oficio del área de la persona, y un lote de otra área no se muestra ("Este lote no pertenece a su área") (RF05).
- [ ] Registrar exige el permiso DOCUMENTO_REGISTRAR, y ver Mis documentos y el detalle, DOCUMENTO_VER_AREA. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Revisar y firmar el lote completo | HU12 (Sprint 3) |
| Observar un beneficiario y corregir el lote | HU13 y HU15 |
| Reemitir un certificado de un lote | HU30 |

**Notas técnicas**

- API: GET /api/lotes/plantilla?tipo=… (descarga el .xlsx), POST /api/lotes/importar (lee el .xlsx y devuelve las filas), POST /api/lotes/vista-previa, POST /api/lotes (registra) y GET /api/lotes/{numero} (detalle). GET /api/documentos agrupa los documentos de un lote.
- La plantilla y la lectura del Excel se hacen en el servidor con Apache POI. El archivo no se guarda.
- Migración V11: tabla lote (número único por año, tipo, área, datos del evento, quién y cuándo) y la columna documento.lote_id.
- El número del lote se asigna dentro de la transacción con un bloqueo, para que dos envíos simultáneos no reciban el mismo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 2 | RF13–RF19 (relacionados: RF05, RF20) |

---

## E3: Revisión y autorización de emisión

**Objetivo:** Permitir que el director revise, observe, rechace y firme los documentos sin depender de su presencia en la sede.
**Requerimientos:** RF21–RF35 · **Sprints:** 3 y 4 · **Fuente:** Tabla 19 de la tesis.

---

### HU10: Ver los documentos pendientes de revisión

**Como** director, **quiero** ver los documentos pendientes de revisión, **para** atenderlos en orden.

**Contexto**

Es la bandeja del Director. Hoy recibe los documentos impresos de varias áreas y no tiene una vista que le diga qué está pendiente ni en qué orden atenderlo. Con esta historia ve, en la opción "Por revisar", todo lo que las áreas enviaron (HU08 y HU09). Los muestra del más antiguo al más reciente, y cada lote aparece como un solo elemento (RF21). Al abrir un documento o un lote, la plataforma registra que lo revisó (RF22). Ese registro es lo que la HU11 exige para dejar seleccionarlo y firmarlo.

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se ordenan del más antiguo al más reciente.
- [ ] Los lotes aparecen como un solo elemento.
- [ ] Se registra qué documentos fueron revisados.
- [ ] La opción "Por revisar" deja de mostrar el aviso "Se habilita en el Sprint 3". Lista los documentos Pendientes de todas las áreas, con el subtítulo "Documentos enviados por las áreas, del más antiguo al más reciente". Cada fila muestra el tipo, el beneficiario, el área, quién lo envió, la fecha de envío y la revisión. En los de solicitud de parte se muestra también el número de expediente.
- [ ] Un lote se muestra en una sola fila, con su número, el nombre del evento y la cantidad de certificados (por ejemplo, "Lote 2026-001 · Manejo integrado de plagas en café · 8 certificados").
- [ ] La columna Revisión dice "Sin revisar" o "✓ Revisado".
- [ ] Al abrir un documento se ven sus datos (con el expediente, si lo tiene) y su vista previa con la plantilla. Al abrirlo queda registrado como revisado, con quién y cuándo, y el evento queda en su historial.
- [ ] Al abrir un lote se ven los datos del evento y quién lo envió. A la izquierda está el certificado del beneficiario elegido, y se puede pasar con "‹ Anterior" y "Siguiente ›" ("Certificado 3 de 8"). A la derecha está la relación de beneficiarios con su DNI: al pulsar un nombre se muestra su certificado. Abrir el lote cuenta como revisión de todos sus documentos (RF22).
- [ ] Desde el detalle se vuelve a la bandeja con "← Volver a Por revisar", y el elemento aparece como Revisado.
- [ ] Sin pendientes se muestra "¡Todo al día! No tiene documentos pendientes de revisión".
- [ ] Solo un documento Pendiente se puede abrir para revisión. Uno inexistente o que ya no está Pendiente no se muestra.
- [ ] Solo las cuentas con el permiso DOCUMENTO_REVISAR (rol Director) ven la opción y pueden consultar la bandeja. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Seleccionar los revisados y firmarlos ("Firmar seleccionados") | HU11 |
| Firmar el lote completo | HU12 |
| Observar y rechazar (con su ventana de motivo) | HU13 y HU14 (Sprint 4) |
| Contador de pendientes en el menú y avisos de documentos nuevos | HU26–HU28 (Sprint 6, notificaciones) |
| Etiquetas "Corregido" y "Reemisión" | HU15 y HU30 (Sprint 4) |

**Notas técnicas**

- API: GET /api/revision (bandeja) y POST /api/revision/documentos/{codigo} y POST /api/revision/lotes/{numero} (abren para revisar y registran la revisión). Se usa POST porque registra un dato.
- Migración V12: columnas revisado_por y revisado_en en documento, y el evento REVISADO en documento_historial.
- El Director no está limitado por área (RF05 solo limita al Área encargada).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 3 | RF21, RF22 |


### HU11: Firmar uno o varios documentos

**Como** director, **quiero** firmar uno o varios documentos revisados en una sola operación, **para** aprobar su emisión sin estar en la sede.

**Contexto**

La firma es el registro de cada documento en el contrato `RegistroDocumentos` de la red Besu. La billetera del Director (MetaMask) firma la transacción en su navegador, así que el servidor nunca conoce su clave (RNF05). El contrato ya tiene el rol de firmante (HU06). Esta historia le agrega el registro de documentos, y usa la preparación de HU17 (PDF final, hash y CID en IPFS).

| Paso (como en el prototipo) | Qué ocurre |
|---|---|
| Verificando su billetera | La billetera conectada es la registrada para el Director (HU06), está en la red de la plataforma y el contrato le reconoce el rol de firmante |
| Confirmación | La ventana muestra la cuenta, "Firmar [N] documentos" y "Costo de la operación: Sin costo". Después la billetera pide su propia confirmación |
| Preparando los documentos | HU17: cada documento pasa a Procesando firma y su PDF final se guarda en IPFS |
| Registrando la firma | La billetera envía al contrato el código, el hash del PDF y el HMAC del DNI de cada documento, en transacciones de hasta 50 documentos |
| Confirmando el registro | El servidor lee cada transacción confirmada en la blockchain y pasa sus documentos a **Firmado** |
| Resultado | "¡Listo! Se firmaron [N] documentos", y aparte los que no se pudieron firmar, con su motivo |

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Solo se firman documentos revisados.
- [ ] Se verifica la billetera y la red antes de firmar.
- [ ] Una selección de más de 50 documentos se divide en varias transacciones.
- [ ] Un documento que falla vuelve a Pendiente sin detener al resto.
- [ ] En Por revisar, cada fila revisada tiene una casilla. Las no revisadas la tienen deshabilitada, con el aviso "Revise el documento antes de seleccionarlo." Al seleccionar aparece la barra "[N] seleccionados ([M] certificados)" con el botón "Firmar seleccionados". Un lote se selecciona entero.
- [ ] En la revisión de un documento está el botón "Firmar".
- [ ] El contrato solo acepta registros de una billetera con el rol de firmante, y un código no se registra dos veces.
- [ ] El documento firmado guarda la transacción, el bloque, la billetera que firmó y la **fecha oficial de emisión, que es la del bloque** (RF32). El servidor no marca nada como firmado sin leerlo antes en la blockchain.
- [ ] Si el Director cancela en la billetera o una transacción falla, sus documentos vuelven a Pendiente, siguen revisados y queda el motivo en su historial. Los de las demás transacciones siguen.
- [ ] Antes de devolver un documento a Pendiente, el servidor comprueba en el contrato que no quedó registrado.
- [ ] Los documentos firmados salen de Por revisar, y el Área encargada los ve como **Firmado** (verde) en Mis documentos.
- [ ] Solo el Director (permiso DOCUMENTO_FIRMAR) puede firmar. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| "Firmar lote" en la revisión del lote y firmar sin los beneficiarios observados | HU12 |
| Corregir documentos detenidos en Procesando firma si se cierra el navegador a mitad de la firma | HU18 |
| Avisar a Mesa de Partes y al área | HU26–HU28 (Sprint 6) |
| Pantalla Documentos firmados, con búsqueda e historial | HU22–HU24 |
| Verificación pública con el registro del contrato | HU19–HU21 (Sprint 5) |

**Notas técnicas**

- Contrato:
  - `registrarDocumentos(string[] codigos, bytes32[] hashes, bytes32[] dniHmacs)`, de 1 a 50 por transacción, solo para el rol de firmante;
  - emite `DocumentoRegistrado` por cada documento;
  - `consultar(codigo)` devuelve el hash, el HMAC del DNI, el firmante y la fecha del bloque (lo usará HU21).
- API:
  - `GET /api/firma/billetera`: la billetera registrada y si es firmante;
  - `POST /api/firma/preparacion` (HU17), que ahora acepta códigos y números de lote;
  - `POST /api/firma/confirmacion` con la transacción;
  - `POST /api/firma/cancelacion` con los códigos no registrados.
- Red sin costo: precio del gas 0 (RNF11).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF23, RF28–RF31 (relacionados: RF32, RNF05) |

### HU12: Revisar y firmar un lote

**Como** director, **quiero** revisar y firmar un lote como una unidad, **para** aprobar los certificados de un evento sin abrirlos uno por uno.

**Contexto**

Un lote (HU09) reúne los certificados de un mismo evento. Abrirlo ya cuenta como revisión de todos sus certificados (HU10), y la bandeja ya permite seleccionarlo entero para firmarlo (HU11). Esta historia completa la revisión del lote: el Director puede observar o rechazar algunos beneficiarios, o el lote completo, y firmar el resto desde la misma pantalla. Como en el prototipo (flujo F3), si observa 1 de 8 certificados y firma el lote, se firman 7 y el observado vuelve al área.

| Acción en la revisión del lote | Qué ocurre |
|---|---|
| Observar seleccionados / Observar lote | Los certificados pasan a **Observado** con el motivo y vuelven al Área encargada, que los podrá corregir con HU15 |
| Rechazar seleccionados / Rechazar lote | Los certificados pasan a **Rechazado** con el motivo. El rechazo es definitivo |
| Firmar lote | Se firman los certificados del lote que siguen Pendientes, con la ventana de firma de HU11 |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Revisar el certificado de ejemplo y la relación cuenta como revisión de todo el lote. Ya se cumple desde HU10.
- [ ] Se puede observar o rechazar beneficiarios individuales o el lote completo.
- [ ] La relación tiene una casilla por certificado Pendiente. "Observar seleccionados" y "Rechazar seleccionados" se habilitan solo con certificados marcados.
- [ ] La ventana de motivo:
  - tiene el título de la acción ("Observar beneficiarios seleccionados", "Observar lote", "Rechazar beneficiarios seleccionados" o "Rechazar lote");
  - pide el campo **Motivo**, obligatorio y de hasta 500 caracteres, con la ayuda "Explique qué debe corregirse" dentro del campo;
  - "Confirmar" está deshabilitado mientras el motivo esté vacío;
  - al rechazar, avisa: "El rechazo es definitivo. El documento no podrá reenviarse."
- [ ] El motivo queda en el documento y en su historial, con quién lo decidió y cuándo.
- [ ] Solo cambian los certificados Pendientes del lote. Los ya firmados, observados o rechazados no se tocan.
- [ ] "Firmar lote" firma los certificados que siguen Pendientes. El resultado dice "¡Listo! Se firmaron [N] certificados", y aparte cuántos fueron observados y devueltos al área y cuántos fueron rechazados. Los que no se pudieron firmar se muestran con el nombre del beneficiario.
- [ ] Un lote sin certificados Pendientes sale de Por revisar.
- [ ] El Área encargada ve en Mis documentos cuántos certificados del lote hay en cada estado (por ejemplo, "Firmado 7 · Observado 1"). En el detalle del lote ve el estado de cada certificado y el motivo de los observados y rechazados.
- [ ] Solo el Director observa (permiso DOCUMENTO_OBSERVAR) y rechaza (permiso DOCUMENTO_RECHAZAR). Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Observar o rechazar un documento a solicitud de parte | HU13 y HU14 (Sprint 4) |
| Corregir y reenviar los observados | HU15 (Sprint 4) |
| Avisos al área y a Mesa de Partes | HU26–HU28 (Sprint 6) |

**Notas técnicas**

- API:
  - `POST /api/revision/lotes/{numero}/observacion`;
  - `POST /api/revision/lotes/{numero}/rechazo`.
  - Las dos reciben `{"codigos": [...], "motivo": "..."}`. Sin códigos, la acción se aplica a todo el lote.
- Cada cambio de estado es una sola sentencia condicionada a que el certificado siga Pendiente, como la revisión de HU10.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 3 | RF22, RF27 (relacionados: RF24–RF26) |

### HU13: Observar un documento

**Como** director, **quiero** observar un documento indicando un motivo, **para** que el área lo corrija.

**Contexto**

Con HU12 el Director ya puede observar certificados de un lote. Esta historia lleva la misma acción a la revisión de un documento individual, como los de a solicitud de parte. Siguiendo el prototipo, la revisión tiene los botones "Rechazar" (HU14), "Observar" y "Firmar" (HU11). El documento observado vuelve al Área encargada con el motivo, y el área lo corrige y reenvía con HU15.

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El motivo es obligatorio.
- [ ] El documento vuelve al área encargada.
- [ ] La observación queda en el historial.
- [ ] En la revisión de un documento Pendiente está el botón "Observar". Abre la ventana de motivo de HU12, con el título "Observar documento" y el campo **Motivo** (obligatorio, hasta 500 caracteres, con la ayuda "Explique qué debe corregirse"). "Confirmar" está deshabilitado mientras esté vacío.
- [ ] Al confirmar, el documento pasa a **Observado** y sale de Por revisar. La pantalla dice "El documento fue observado y volvió al área." y ya no ofrece acciones.
- [ ] El motivo queda en el documento. El historial registra "Observado por [Director]: [motivo]", con quién y cuándo.
- [ ] El Área encargada ve el documento como Observado (naranja) en Mis documentos. En su detalle ve el motivo y el aviso de que podrá corregirlo y reenviarlo.
- [ ] Solo se observa un documento Pendiente. Uno que ya está en Procesando firma, Firmado u Observado no cambia y se responde que no está pendiente.
- [ ] Solo el Director (permiso DOCUMENTO_OBSERVAR) puede observar. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Rechazar un documento | HU14 |
| Corregir y reenviar el observado | HU15 |
| Aviso al área de la observación | HU27 (Sprint 6) |

**Notas técnicas**

- API: `POST /api/revision/documentos/{codigo}/observacion` con `{"motivo": "..."}`. Reutiliza la decisión de HU12: una sola sentencia condicionada a que el documento siga Pendiente.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF25 |

### HU14: Rechazar un documento

**Como** director, **quiero** rechazar un documento indicando un motivo, **para** concluir un trámite que no debe emitirse.

**Contexto**

Con HU12 el Director ya puede rechazar certificados de un lote, y con HU13 observa un documento individual. Esta historia agrega "Rechazar" (en rojo, como en el prototipo) a la revisión de un documento. A diferencia de la observación, el rechazo es definitivo: el documento no vuelve a revisión, no se corrige ni se firma.

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El motivo es obligatorio.
- [ ] El rechazo es definitivo.
- [ ] En los documentos a solicitud de parte se avisa a Mesa de Partes. **El aviso lo envía HU28 (Sprint 6)**, que trae las notificaciones. Hoy el rechazo queda registrado, con su motivo, para que HU28 lo informe.
- [ ] En la revisión de un documento Pendiente está el botón "Rechazar", en rojo. Abre la ventana de motivo con el título "Rechazar documento", el campo **Motivo** (obligatorio, hasta 500 caracteres) y el aviso "El rechazo es definitivo. El documento no podrá reenviarse."
- [ ] Al confirmar, el documento pasa a **Rechazado** y sale de Por revisar. La pantalla dice "El documento fue rechazado." con el motivo, y ya no ofrece acciones.
- [ ] El motivo queda en el documento. El historial registra "Rechazado por [Director]: [motivo]", con quién y cuándo.
- [ ] Un documento rechazado no se puede observar, firmar, ni volver a rechazar.
- [ ] El Área encargada lo ve como Rechazado (rojo) en Mis documentos. En su detalle ve el motivo y el aviso de que el rechazo es definitivo.
- [ ] Solo se rechaza un documento Pendiente. Solo el Director (permiso DOCUMENTO_RECHAZAR) puede rechazar. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Aviso del rechazo a Mesa de Partes | HU28 (Sprint 6) |
| Aviso del rechazo al Área encargada | HU27 (Sprint 6) |

**Notas técnicas**

- API: `POST /api/revision/documentos/{codigo}/rechazo` con `{"motivo": "..."}`. Usa la misma decisión de HU12 y HU13.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 4 | RF24, RF26 |

### HU15: Corregir y reenviar un documento observado

**Como** Área encargada, **quiero** corregir un documento observado y reenviarlo, **para** continuar el trámite sin iniciar uno nuevo.

**Contexto**

Con HU12 y HU13, el Director observa un documento (o certificados de un lote) con un motivo, y el documento vuelve al área. Esta historia permite corregirlo y reenviarlo. Conserva su código de verificación y su historial, en vez de registrar uno nuevo. Como en el prototipo, el documento reenviado aparece en Por revisar con la etiqueta **"Corregido"**.

| Documento observado | Qué se corrige |
|---|---|
| A solicitud de parte (HU13) | Todo el formulario del registro (HU08), precargado con los datos enviados: expediente, beneficiario y datos propios del tipo |
| Certificado de un lote (HU12) | Los nombres, los apellidos y el DNI del beneficiario. Los datos del evento son del lote y no cambian |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se muestra el motivo de la observación.
- [ ] Se aplican las mismas validaciones del registro.
- [ ] El documento vuelve a Pendiente.
- [ ] En el detalle de un documento Observado está el botón **"Corregir y reenviar"**. En un lote, cada certificado Observado tiene "Corregir" en su fila.
- [ ] La corrección muestra arriba el motivo de la observación. Un documento a solicitud de parte pasa otra vez por la vista previa y se reenvía con confirmación.
- [ ] Las validaciones son las del registro: formato y unicidad del expediente (sin contarse a sí mismo), nombres, DNI y datos del tipo. En un lote, el DNI no puede repetirse con otro certificado del mismo lote.
- [ ] Al reenviar, el documento vuelve a **Pendiente**, conserva su código y su lote, y pierde la revisión anterior: el Director debe revisarlo de nuevo. El motivo deja de mostrarse, pero queda en el historial.
- [ ] El historial registra "Corregido y reenviado a revisión por [persona]", con los cambios: "Apellidos: Huaman Inga → Huamán Inga".
- [ ] En Por revisar, el documento (o su lote) aparece con la etiqueta **"Corregido"**.
- [ ] Solo se corrige un documento Observado del área propia. Uno Pendiente, Firmado o Rechazado no se corrige: el rechazo es definitivo (HU14). Uno de otra área responde 403.
- [ ] Solo el Área encargada (permiso DOCUMENTO_CORREGIR) corrige. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Aviso al Director de que hay un documento corregido | HU26 (Sprint 6) |
| Corregir un documento ya firmado (reemisión) | HU30 |

**Notas técnicas**

- API: `POST /api/documentos/{codigo}/correccion`, con la misma solicitud del registro. En un certificado de lote solo se usan los nombres, los apellidos y el DNI.
- Se bloquea la fila del documento durante la corrección, para que dos reenvíos a la vez no lo corrijan dos veces.
- Se recalcula el HMAC del DNI (RF17) y el texto con la plantilla.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 4 | RF20, RF25 |

### HU16: Generar el PDF final y su hash

**Como** sistema, **quiero** generar el PDF final y calcular su hash al iniciarse la firma, **para** que lo registrado coincida con lo que se imprime.

**Contexto**

La vista previa (HU08, HU09) es solo una imagen en pantalla con la marca "VISTA PREVIA". Al firmar hace falta el documento definitivo: un PDF con la fecha de emisión, el código QR y el código de verificación (RF36). Su hash SHA-256 es lo que se registra en la blockchain (RF31), así que lo que se imprime y lo registrado son el mismo archivo (RF30). Esta historia construye la generación del PDF y el cálculo del hash. La firma que los usa llega con HU11, y el almacenamiento en IPFS, con HU17.

**Contenido del PDF**

| Elemento | Detalle |
|---|---|
| Formato | A4 horizontal, con el diseño de la vista previa del prototipo: encabezado y logo de la agencia, título (CERTIFICADO o CONSTANCIA), "Otorgado a", nombre del beneficiario y el texto del documento. Sin la marca de agua |
| Fecha de emisión | El día en que se inicia la firma, escrito con el mes en letras (por ejemplo, 4 de noviembre de 2026), en hora de Lima |
| Firma | Nombre del Director y "Director de la Agencia Agraria Satipo", con la nota "Firmado digitalmente mediante blockchain" |
| Código QR | Lleva la dirección de verificación del portal público con el token del documento (RF16). Debajo se imprime el código de verificación |
| Leyenda | "Verifique la autenticidad de este documento en {portal} con el código {código}" (RF36) |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El PDF incluye la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.
- [ ] El hash se calcula con SHA-256.
- [ ] El PDF reproduce los datos y el texto que el Área encargada envió y el Director revisó (HU08, HU09), sin la marca "VISTA PREVIA".
- [ ] El código QR se puede leer con un lector común, y lleva a la dirección de verificación del documento: la del portal con el token aleatorio del QR, nunca el DNI.
- [ ] El hash es el SHA-256 de los bytes exactos del archivo, en hexadecimal (64 caracteres), y es lo que se registrará en la blockchain (HU11).
- [ ] La dirección del portal se configura fuera del código (PLATAFORMA_PORTAL_URL). El portal se construye en el Sprint 5.
- [ ] El Director puede abrir una **muestra** del PDF final desde la revisión de un documento o de un lote, para ver cómo se imprimirá. La muestra lleva la marca "MUESTRA – SIN VALOR". No se guarda ni se registra.
- [ ] Solo el Director (permiso DOCUMENTO_REVISAR) puede abrir la muestra, y solo de un documento Pendiente. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Generar el PDF al firmar, guardar su hash y registrarlo en el contrato | HU11 (usa lo construido aquí) |
| Guardar el PDF en IPFS y su CID | HU17 |
| Portal de verificación al que apunta el QR | HU19–HU21 (Sprint 5) |
| Descargar e imprimir el documento firmado | HU25 (Sprint 6) |

**Notas técnicas**

- El PDF se genera en el servidor con OpenPDF y el QR con ZXing, dos bibliotecas libres. El logo va dentro del backend.
- La fecha oficial de emisión es la del bloque (RF32). La fecha impresa es la del día en que se inicia la firma: las dos coinciden en el día, porque el bloque se confirma segundos después de la firma.
- API: GET /api/revision/documentos/{codigo}/pdf (la muestra), solo para el Director.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30, RF36 (relacionados: RF31, RF32) |


### HU17: Almacenar el PDF en IPFS

**Como** sistema, **quiero** almacenar el PDF final en la red IPFS privada, **para** conservar el original para su verificación y reimpresión.

**Contexto**

El PDF final y su hash se generan con HU16. El nodo IPFS privado ya existe (DRA-46): solo habla con nodos que tienen su clave de enjambre, para que los PDF, que tienen datos personales, no circulen por la red pública de IPFS (RNF03). Al firmar (HU11), antes de que el Director registre los hashes con su billetera, el sistema **prepara** cada documento. Esta historia construye esa preparación, y HU11 la usa:

| Paso | Qué ocurre |
|---|---|
| 1 | El documento pasa a **Procesando firma**, un estado que se guarda (lo necesita HU18 para corregir los que se detengan) |
| 2 | Se genera el PDF final con la fecha de emisión de ese día y se calcula su SHA-256 (HU16) |
| 3 | El PDF se guarda en IPFS y queda fijado, para que no se borre |
| 4 | Se guardan el CID, el hash y la fecha de emisión impresa. El documento sigue en Procesando firma hasta que HU11 registre la firma |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se guarda el identificador (CID) del archivo.
- [ ] Si el almacenamiento falla, el documento sale de la operación, vuelve a Pendiente y se registra el error.
- [ ] El archivo guardado en IPFS es exactamente el del hash: al recuperarlo por su CID, su SHA-256 es el guardado.
- [ ] El PDF queda fijado (pin) en el nodo y su CID es de la versión 1 (`bafy…`).
- [ ] Solo se preparan documentos Pendientes que el Director ya revisó (RF22, RF23). Los demás se informan como no preparados, con su motivo, sin detener al resto.
- [ ] Si falla un documento, los demás de la operación siguen. El error queda en el historial del documento y en el registro del servidor.
- [ ] Un documento no se prepara dos veces a la vez: si ya está en Procesando firma, se informa como no preparado.
- [ ] El documento en Procesando firma sale de la bandeja Por revisar, y el Área encargada lo ve con ese estado en Mis documentos.
- [ ] Solo el Director (permiso DOCUMENTO_FIRMAR) puede preparar documentos. Sin sesión se responde 401 y con otro rol, 403 (RF04).
- [ ] La dirección de la API de IPFS se configura fuera del código (PLATAFORMA_IPFS_URL). La API solo escucha en el servidor (127.0.0.1).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Pantalla de firma, registro de los hashes en el contrato y paso a Firmado | HU11 y HU12 (usan esta preparación) |
| Corregir los documentos detenidos en Procesando firma | HU18 |
| Recuperar el PDF de IPFS para verificarlo o reimprimirlo | HU21 y HU25 |
| Réplica del nodo IPFS en AWS | DRA-44 |

**Notas técnicas**

- API: `POST /api/firma/preparacion` con `{"codigos": [...]}`, hasta 300 por operación (un lote completo). Responde los preparados (código, hash, CID) y los no preparados (código, motivo). HU11 usa los hashes para la transacción de la billetera.
- Cada documento se prepara en su propia transacción, para que un fallo no deshaga los demás.
- El backend usa la API HTTP de Kubo (`add` con `pin=true` y `cid-version=1`).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 3 | RF30 (relacionados: RF23, RNF03) |

### HU18: Sincronizar los estados con la blockchain

**Como** sistema, **quiero** sincronizar el estado de los documentos con la blockchain, **para** que ninguna firma o anulación quede sin reflejarse.

**Contexto**

Con HU11, el navegador del Director registra la firma con su billetera y luego avisa al servidor para confirmarla. Si el navegador se cierra o pierde la conexión entre esos dos pasos, la firma queda en la blockchain y el documento queda detenido en Procesando firma. También puede quedar detenido un documento preparado (HU17) cuya transacción nunca se envió. Esta historia agrega una tarea del servidor que se ejecuta cada cierto tiempo y corrige las dos situaciones:

| Situación | Qué hace la sincronización |
|---|---|
| El contrato registró un documento que sigue en Procesando firma | Lee el evento `DocumentoRegistrado` y, si el hash coincide con el de su PDF, lo pasa a **Firmado** con la transacción, el bloque, la billetera y la fecha del bloque (RF32) |
| Un documento lleva más del plazo en Procesando firma y el contrato no lo registró | Lo devuelve a **Pendiente**, revisado, con el motivo en su historial |

La anulación se registrará en el contrato con HU29 (Sprint 4). Esta misma sincronización leerá entonces su evento.

**Criterios de aceptación**

Los tres primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se leen los eventos del smart contract y se reanuda desde el último bloque procesado.
- [ ] Los documentos detenidos en proceso de firma se corrigen.
- [ ] Un código ya registrado no se registra de nuevo.
- [ ] El último bloque procesado se guarda en PostgreSQL, en la misma transacción en que se aplican sus eventos. Si el servidor se reinicia, continúa desde ahí sin aplicar dos veces el mismo evento.
- [ ] La primera vez empieza en el bloque donde se desplegó el contrato (PLATAFORMA_CONTRATO_BLOQUE_INICIAL). Lee como máximo 5000 bloques por consulta.
- [ ] Un evento cuyo hash no coincide con el del PDF preparado no marca nada y queda en el registro del servidor como inconsistencia.
- [ ] Un documento detenido solo vuelve a Pendiente después de que la sincronización se pone al día con la blockchain y de comprobar en el contrato que no está registrado.
- [ ] La preparación (HU17) no acepta un documento cuyo código ya está registrado en el contrato. El contrato también lo rechaza (`CodigoYaRegistrado`, HU11).
- [ ] El historial distingue lo que hizo la sincronización: "Firma confirmada por la sincronización…" o "La firma no se completó en el plazo…".
- [ ] Si la blockchain no responde, no se cambia nada y se reintenta en la siguiente ejecución.
- [ ] El intervalo (PLATAFORMA_SINCRONIZACION_INTERVALO, 30 segundos) y el plazo de un documento detenido (PLATAFORMA_FIRMA_PLAZO, 15 minutos) se configuran fuera del código.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Registrar y sincronizar la anulación | HU29 (Sprint 4) |
| Pantalla de auditoría con el estado de la sincronización | HU24 (Sprint 4) |
| Avisos de firma al área y a Mesa de Partes | HU27 y HU28 (Sprint 6) |

**Notas técnicas**

- Tarea programada de Spring (`@Scheduled`). Solo corre si el contrato está configurado.
- Lee los eventos con `eth_getLogs`, filtrando por el contrato y el evento `DocumentoRegistrado`.
- Tabla `sincronizacion_blockchain` con el último bloque procesado. Columna `firma_iniciada_en` en el documento.
- Un evento de la sincronización lo registra la cuenta dueña de la billetera que firmó; si no se encuentra, queda como hecho por el sistema.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 13 | 3 | RF32–RF35 (relacionados: RNF10) |

---

## E4: Verificación pública de autenticidad

**Objetivo:** Permitir que cualquier tercero compruebe la autenticidad de un documento en segundos.
**Requerimientos:** RF36–RF41 · **Sprint:** 5 · **Fuente:** Tabla 20 de la tesis.

---

### HU19: Verificar mediante el código QR

**Como** entidad externa, **quiero** escanear el código QR de un documento, **para** comprobar su autenticidad y ver el documento completo.

**Contexto**

El PDF final de cada documento lleva un código QR (HU16) que apunta a `{portal}/verificar/{token}`. El token es aleatorio, de 256 bits, y nunca contiene el DNI. Esta historia construye ese **portal público de verificación**. Es un proyecto aparte de la plataforma interna, sin inicio de sesión ni menú, pensado para abrirse en el celular de quien escanea el QR. El resultado lo calcula la comprobación de autenticidad de HU21.

| Paso | Qué ve la persona |
|---|---|
| 1 | Escanea el QR y se abre el portal en su navegador. Mientras se comprueba, ve "Verificando el documento…" |
| 2 | Ve el resultado: **Documento válido**, **Documento anulado** o **Documento no válido**, con su explicación |
| 3 | Si es válido, ve el tipo, el titular, la fecha de emisión y el estado, y debajo **el documento completo**, que puede abrir o descargar |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] No se requiere registro: el portal no pide usuario ni contraseña.
- [ ] El resultado se muestra en menos de dos segundos (RNF01). Mientras tanto se ve un indicador de progreso.
- [ ] Si el documento es válido, se muestra completo.
  - Es el PDF final guardado en IPFS, el mismo cuyo hash se comprobó en la blockchain.
  - Se ve dentro de la página, con los botones "Abrir el documento" y "Descargar PDF" para los celulares que no muestran PDF incrustados.
- [ ] **Válido:** "Documento válido", con el mensaje de HU21, y:
  - el tipo de documento y el titular;
  - la fecha de emisión con el mes en letras (por ejemplo, 4 de noviembre de 2026), en hora de Lima;
  - el estado "Vigente".
- [ ] **Anulado:**
  - "Documento anulado", con el tipo, el titular, la fecha de emisión y la fecha de anulación;
  - si fue reemplazado, el aviso "Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.", sin su código (RF41);
  - **no se muestra el documento**, para que no se use como válido.
- [ ] **No válido:** "Documento no válido" y "No encontramos un documento válido con estos datos.", sin ningún dato ni documento.
- [ ] Si la verificación no está disponible, el portal muestra el mensaje de HU21 y el botón "Intentar nuevamente".
- [ ] El documento solo se entrega si la verificación es Válida (`GET /api/verificacion/{token}/documento`). En cualquier otro caso responde 404. No se guarda en caché.
- [ ] La página se adapta al celular (360 px de ancho) y a la computadora, con la identidad de la agencia (logo y colores de la plataforma).
- [ ] La portada (`/`) explica cómo verificar un documento con el QR. El ingreso del código de verificación llega con HU20.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Verificar escribiendo el código de verificación | HU20 |
| Límite de 10 consultas por minuto por IP (RNF04) | HU20 |
| Publicar el portal en internet (dominio y servidor) | DRA-44 (AWS) |

**Notas técnicas**

- Proyecto nuevo `plataforma/portal`: React + Vite + Tailwind (ADR-001), con la guía visual de la plataforma, en el puerto 5174 (`PLATAFORMA_PORTAL_URL`).
- Ruta `/verificar/{token}`, que es la del QR. Usa `GET /api/verificacion/{token}` (HU21) y `GET /api/verificacion/{token}/documento`.
- La CI suma el job "Portal (React + Vite)", y `levantar.sh` levanta también el portal.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 5 | RF37, RF39 |

### HU20: Verificar mediante el código de verificación

**Como** entidad externa, **quiero** ingresar el código de verificación de un documento, **para** comprobar su autenticidad cuando no puedo escanear el código QR.

**Contexto**

Cada documento lleva impreso, debajo del QR, su **código de verificación** con el formato `DRA-AAAA-XXXXXX` (RF16). Los seis caracteres finales excluyen los que se confunden entre sí, como O y 0 o I y 1 (RNF04). Sirve cuando el QR no se puede escanear, por ejemplo en una fotocopia borrosa o cuando se lo dictan por teléfono a quien verifica.

Como el código es corto y está a la vista, quien lo ingresa ve **menos** que con el QR (RF40): el resultado, el tipo, el titular, la fecha de emisión y el estado, sin el documento. La comprobación es la misma de HU21. Para que nadie pueda probar códigos al azar, el portal limita las consultas a diez por minuto por dirección IP (RNF04).

**Criterios de aceptación**

Los tres primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se valida el formato del código.
  - El portal acepta minúsculas, espacios alrededor y los guiones opcionales: "dra 2026 f8r2ma" se lee como `DRA-2026-F8R2MA`.
  - Un formato inválido se señala junto al campo, sin consultar al servidor: "Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA."
  - El servidor vuelve a validarlo, y un código mal formado responde No válido sin consultar la blockchain.
- [ ] Se muestran solo el tipo de documento, el nombre del titular, la fecha de emisión y el estado.
  - **No se muestra el documento** ni se puede descargar con el código (RF40).
  - En un anulado se agregan la fecha de anulación y si existe una versión corregida, sin su código (RF41).
- [ ] Se limita el número de consultas por dirección IP: **10 por minuto** (RNF04).
  - El límite cuenta las consultas con el código y con el QR.
  - La consulta número 11 dentro del minuto responde 429: "Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.", con la cabecera `Retry-After`.
  - El límite se configura fuera del código (`PLATAFORMA_VERIFICACION_CONSULTAS_POR_MINUTO`).
- [ ] La portada del portal tiene el campo **Código de verificación** y el botón "Verificar". El resultado aparece debajo, con las mismas tarjetas de HU19 (Válido, Anulado, No válido) y el indicador de progreso.
- [ ] El resultado se muestra en menos de dos segundos (RNF01) y no requiere registro (RF37).
- [ ] La IP es la del visitante, aunque el portal esté detrás de un proxy. Se usa `X-Forwarded-For` solo cuando viene de un proxy de confianza: la red interna o el propio servidor.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Registrar cada consulta para la auditoría | HU24 (Sprint 6) |
| Un límite compartido entre varias instancias del backend | DRA-44 (AWS). Hoy el límite vive en la memoria de cada instancia |

**Notas técnicas**

- API: `GET /api/verificacion/codigo/{codigo}`. Responde con el mismo formato de HU21.
- El límite usa Bucket4j (ADR-001), con un balde por IP en memoria. Los baldes inactivos se descartan.
- La descarga del documento (HU19) no cuenta para el límite, porque solo responde con un token válido de 256 bits.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 5 | RF37, RF40 |

### HU21: Comprobar la autenticidad del documento

**Como** sistema, **quiero** comprobar la autenticidad comparando el documento almacenado con su registro en la blockchain, **para** entregar un resultado confiable.

**Contexto**

Cada documento firmado está registrado en el contrato `RegistroDocumentos` (HU11): ahí están el hash SHA-256 de su PDF, el HMAC del DNI del beneficiario y la fecha del bloque. El PDF está guardado en el IPFS privado (HU17). Si se anuló, también lo dice el contrato (HU29), y si se reemplazó, el contrato sabe por cuál (HU30).

Esta historia construye la comprobación que usará el portal público. Con el QR (HU19) y con el código de verificación (HU20), el portal le pide el resultado al servidor, y el servidor lo decide así:

| Paso | Qué se comprueba | Si falla |
|---|---|---|
| 1 | El token del QR corresponde a un documento firmado o anulado de la plataforma | No válido |
| 2 | El contrato tiene registrado ese código (consulta de solo lectura) | No válido |
| 3 | El PDF guardado en IPFS se descarga y se recalcula su SHA-256. Debe ser igual al hash registrado en el contrato | No válido |
| 4 | El HMAC del DNI guardado en la plataforma es igual al registrado en el contrato | No válido |
| 5 | El contrato dice si el documento está anulado y, si lo está, si tiene una versión corregida | Anulado |

Si todo coincide y no está anulado, el resultado es **Válido**. La blockchain es la fuente de verdad (RNF10): si el contrato y la base no coinciden, manda el contrato.

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La consulta al smart contract es de solo lectura.
  - Usa `consultar`, `anulacion` y `reemplazadoPor`.
  - Ninguna verificación envía transacciones ni necesita billetera.
- [ ] Se recalcula el hash del PDF y se compara con el registrado.
  - Se calcula el SHA-256 de los bytes del PDF recuperado de IPFS por su CID y se compara con el hash del contrato.
  - Además se compara el HMAC del DNI.
- [ ] El resultado es **Válido**, **Anulado** o **No válido**.
- [ ] En un documento anulado se informa la fecha y si existe una versión corregida.
  - La fecha es la del bloque de la anulación.
  - La versión corregida se informa **sin revelar su código** (RF41): "Existe una versión corregida de este documento."
- [ ] Un resultado Válido o Anulado entrega lo que el portal muestra:
  - el tipo de documento y el nombre del titular;
  - la fecha de emisión, que es la del bloque del registro (RF32);
  - el estado.
  
  Nunca entrega el DNI, el HMAC, el CID ni datos internos.
- [ ] Un resultado No válido no entrega ningún dato del documento, solo "No encontramos un documento válido con estos datos." El motivo exacto (no registrado, hash distinto, HMAC distinto) queda en el registro del servidor, para el equipo.
- [ ] Si la blockchain o IPFS no responden, el resultado no es "No válido". Se informa "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos." (503).
- [ ] La comprobación responde en menos de dos segundos (RNF01).
- [ ] La API es pública, sin sesión: `GET /api/verificacion/{token}`. Un token con formato inválido responde No válido sin consultar la blockchain.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| El portal público, la ruta del QR y el documento completo | HU19 |
| Verificar con el código de verificación, y el límite de 10 consultas por minuto por IP (RNF04) | HU20 |
| Registrar cada consulta para la auditoría | HU24 (Sprint 6) |

**Notas técnicas**

- Nuevo servicio `VerificacionDeAutenticidad`, que usan HU19 y HU20.
- `ContratoRegistro` gana tres lecturas: el registro de un código, la fecha de su anulación y el código que lo reemplaza.
- El PDF se recupera con `AlmacenDeArchivos.recuperar(cid)` (HU17).

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

**Contexto**

Mesa de Partes atiende al ciudadano que pregunta por su trámite y entrega los documentos firmados. Hasta ahora cada rol solo veía su propia bandeja: el Área encargada, Mis documentos; el Director, Por revisar y Documentos firmados. Esta historia construye la pantalla **Buscar documentos** del rol Consulta interna (permiso `DOCUMENTO_BUSCAR`). La pantalla busca en **todos los documentos de todas las áreas y en cualquier estado**, porque el ciudadano también pregunta por los que siguen en trámite.

| Paso | Qué hace la persona |
|---|---|
| 1 | Abre Buscar documentos. Ve los documentos más recientes |
| 2 | Escribe un nombre, un DNI, un código, un número de expediente o un número de lote. Los resultados se actualizan mientras escribe |
| 3 | Si lo necesita, filtra por estado: Todos, En trámite, Firmados, Anulados o Rechazados |
| 4 | Ubica el documento. Los certificados de un lote aparecen dentro de la fila de su lote |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La búsqueda por nombre admite coincidencias parciales.
  - Basta con parte del nombre o del apellido: "quisp" encuentra a "Rosa Quispe Huamán".
  - Si se escriben varias palabras, deben aparecer todas, en cualquier orden: "rosa huaman" encuentra a "Rosa Quispe Huamán".
  - No distingue mayúsculas, minúsculas ni tildes: "huaman" encuentra "Huamán".
- [ ] Los lotes se despliegan en sus certificados.
  - Un lote ocupa una fila ("Lote 2026-001", con el tipo, el área y la cantidad de certificados) y se despliega con un botón para ver sus certificados.
  - Si la búsqueda coincide con el número del lote, aparece el lote con todos sus certificados, plegado.
  - Si coincide con algunos certificados del lote (por ejemplo, un DNI), aparece el lote **ya desplegado** y solo con esos certificados, con la nota "2 de 25 certificados coinciden con la búsqueda".
- [ ] Si no hay resultados, se informa con un mensaje: "No se encontraron documentos con «texto». Revise lo que escribió o busque por otro dato."
- [ ] Se busca a la vez por todos los datos:
  - **nombre** del beneficiario, con coincidencias parciales;
  - **DNI**, completo o parcial;
  - **código de verificación**, completo o parcial y sin importar las mayúsculas: "f8r2ma" encuentra `DRA-2026-F8R2MA`;
  - **número de expediente**, completo o parcial;
  - **número de lote**: "2026-001".
- [ ] Cada resultado muestra el código, el tipo, el beneficiario, el DNI, el número de expediente, el área, la fecha de envío y el estado, con los mismos colores de Mis documentos.
- [ ] Sin texto, la pantalla muestra los documentos más recientes.
- [ ] Los filtros por estado son Todos, **En trámite** (Pendiente, Procesando firma y Observado), Firmados, Anulados y Rechazados. Se combinan con el texto.
- [ ] Se muestran **hasta 50 filas**, de la más reciente a la más antigua. Si hay más, se avisa: "Se muestran los 50 resultados más recientes. Escriba más datos para precisar la búsqueda."
- [ ] El texto se busca desde **2 caracteres**. Con 1 carácter se indica "Escriba al menos 2 caracteres." y no se consulta al servidor.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_BUSCAR`) puede buscar. Sin sesión se responde 401 y con otro rol, 403 (RF04). La opción del menú deja de mostrar el aviso "Se habilita en el Sprint 6".

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Abrir un resultado para ver su estado y sus datos | HU23 |
| Historial y detalle técnico de auditoría | HU24 |
| Descargar, imprimir y el filtro "Listos para entregar" del prototipo, que depende de lo impreso | HU25 |
| Registrar cada búsqueda en la auditoría | Pregunta abierta al PO (ver HU24) |

**Notas técnicas**

- API: `GET /api/consulta/documentos?texto=…&estado=TODOS|EN_TRAMITE|FIRMADOS|ANULADOS|RECHAZADOS`. Responde `{ filas, hayMas }`. Una fila es un documento o un lote con sus certificados coincidentes, la cantidad total del lote y si se muestran todos.
- La búsqueda se hace en PostgreSQL con una consulta parametrizada. Las tildes se quitan con `translate` y las mayúsculas con `lower`, en la columna y en el texto. Cada palabra del nombre es una condición aparte.
- El servidor vuelve a validar el texto: con menos de 2 caracteres (sin contar espacios) responde 400.
- En el frontend, la búsqueda espera 300 ms después de la última tecla para no consultar en cada una.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 6 | RF42 |

### HU23: Ver el estado de un documento

**Como** personal de Mesa de Partes, **quiero** ver el estado y los datos de un documento, **para** informar al ciudadano sobre su trámite.

**Contexto**

Con HU22, Mesa de Partes ubica el documento en Buscar documentos. Esta historia agrega su **ficha**: al pulsar el código de un resultado se abre una página con el estado y los datos básicos del documento. El estado viene acompañado de una explicación en lenguaje claro, para que Mesa de Partes sepa qué decirle al ciudadano.

| Paso | Qué hace la persona |
|---|---|
| 1 | Busca el documento (HU22) y pulsa su código, también dentro de un lote |
| 2 | Ve el estado, lo que significa y sus fechas, y los datos del documento |
| 3 | Vuelve a Buscar documentos con la misma búsqueda y el mismo filtro |

**Criterios de aceptación**

El primero es el de la Tabla 21 de la tesis. Los demás detallan cómo se cumple.

- [ ] Se muestra uno de los seis estados posibles junto con los datos básicos del documento.
- [ ] El estado se muestra con su color (los de Mis documentos) y con una explicación para el ciudadano:

  | Estado | Explicación | Fechas y datos |
  |---|---|---|
  | Pendiente | "Está en revisión del Director. Todavía no se puede entregar." | Fecha de envío |
  | Procesando firma | "El Director está firmando el documento. Estará listo en unos minutos." | Fecha de envío |
  | Observado | "El Director pidió corregir el documento. El {área} lo corregirá y lo volverá a enviar." | Motivo de la observación |
  | Rechazado | "El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite." | Motivo del rechazo |
  | Firmado | "Firmado y registrado en la blockchain. Se puede entregar al ciudadano." | Fecha y hora de la firma |
  | Anulado | "Fue anulado y ya no es válido." | Fecha de la anulación y motivo |
- [ ] Los datos básicos son: código de verificación, tipo, beneficiario, DNI, origen (a solicitud de parte o de oficio), N.° de expediente, área, fecha de envío y, en un certificado de lote, el número de lote y el nombre del evento.
- [ ] Reemisiones (HU30):
  - en un anulado que fue reemplazado: "Fue reemplazado por el documento {código}", con un enlace a su ficha;
  - en un documento con una reemisión en revisión: "Tiene una reemisión en revisión: {código}", con un enlace;
  - en una reemisión: "Reemplaza al documento {código}", con un enlace.
- [ ] En Buscar documentos, el código de cada resultado (también dentro de un lote) es un enlace a su ficha (`#/buscar/{código}`). El enlace "← Volver a Buscar documentos" regresa con el mismo texto y el mismo filtro.
- [ ] Un código que no existe muestra "No se encontró el documento {código}." y el enlace para volver.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_BUSCAR`) ve la ficha. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Historial de eventos y detalle técnico de auditoría (hash, CID, transacción) | HU24 |
| Ver, descargar e imprimir el documento, y el estado de entrega | HU25 |
| Avisar a Mesa de Partes cuando un documento se firma | HU28 |

**Notas técnicas**

- API: `GET /api/consulta/documentos/{codigo}`. No incluye el HMAC del DNI, el token del QR, el CID ni la transacción (HU24 los muestra en el detalle técnico).
- Un código inexistente responde 404 con el mensaje.
- La búsqueda de HU22 guarda su texto y su filtro en la dirección (`#/buscar?texto=…&estado=…`) para volver a ella desde la ficha.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 2 | 6 | RF43 |

### HU24: Consultar el historial y la auditoría

**Como** personal de Mesa de Partes, **quiero** consultar el historial y el detalle técnico de auditoría de un documento, **para** demostrar su trazabilidad.

**Contexto**

Cada paso del trámite ya queda en el historial del documento (`documento_historial`): el registro, la revisión, la firma, las observaciones, los rechazos, las correcciones, las anulaciones y las reemisiones. Ese historial no se modifica ni se elimina. La firma y la anulación también están en la blockchain (HU11, HU29), y el PDF final, en el IPFS privado (HU17). Esta historia los muestra en la ficha del documento (HU23), en dos secciones:

| Sección | Qué muestra | Para qué |
|---|---|---|
| **Historial** | Cada evento con su fecha, hora y responsable, del más antiguo al más reciente | Explicar qué pasó con el trámite |
| **Detalle técnico de auditoría** (plegado) | El hash del PDF, el CID en IPFS, la transacción y el bloque de la firma, la billetera firmante, la transacción y el bloque de la anulación y el contrato | Demostrar que el documento es el registrado en la blockchain |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Cada evento muestra fecha, hora y responsable.
  - La fecha y la hora van en hora de Lima: 07/11/2026 21:35.
  - El responsable es el nombre de la persona y su rol: "Rosa Quispe Huamán (Área encargada)".
  - Si el evento lo registró el sistema (la sincronización con la blockchain, HU18), el responsable es "Sistema (sincronización con la blockchain)".
  - Cada evento tiene un título claro (por ejemplo, "Registrado y enviado a revisión", "Firmado y registrado en la blockchain") y su detalle tal como se guardó: motivos, cambios, transacción.
  - Los eventos que requieren atención se distinguen por su color: rechazo y anulación en rojo; observación, firma no completada y error de almacenamiento en naranja.
- [ ] El detalle técnico aparece plegado por defecto.
  - El botón "Detalle técnico de auditoría" lo despliega y lo vuelve a plegar.
  - Muestra, cuando existen:
    - huella digital del PDF (SHA-256);
    - identificador en IPFS (CID);
    - transacción y bloque de la firma;
    - billetera firmante;
    - fecha y hora del registro en la blockchain;
    - transacción y bloque de la anulación;
    - dirección del contrato RegistroDocumentos.
  - Cada valor tiene un botón "Copiar".
  - Un documento que todavía no se firmó dice "Todavía no tiene registro en la blockchain."
- [ ] El historial y el detalle técnico se ven en la ficha del documento (HU23), debajo de los datos.
- [ ] Solo quien tiene el permiso `AUDITORIA_VER` (Consulta interna) los consulta. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Ver el PDF y comprobar su hash desde la pantalla | HU25 (descargar o imprimir) y el portal público (HU19–HU21) |
| Registrar las impresiones y los duplicados en el historial | HU25 |
| Registrar quién busca o consulta cada documento | Pregunta abierta al PO: hoy no se registra |

**Notas técnicas**

- API: `GET /api/consulta/documentos/{codigo}/auditoria`, con el permiso `AUDITORIA_VER`. Responde `{ eventos, tecnico }`.
- Los eventos se leen de `documento_historial`, con el nombre y el rol de quien los registró (un `LEFT JOIN`, porque el sistema no tiene cuenta).
- El HMAC del DNI y el token del QR no se muestran.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 5 | 6 | RF44 |

### HU25: Descargar o imprimir un documento

**Como** personal de Mesa de Partes, **quiero** descargar o imprimir un documento firmado, **para** entregarlo o emitir un duplicado sin reiniciar el trámite.

**Contexto**

El PDF final de cada documento firmado está en el IPFS privado (HU17), y su hash, en la blockchain (HU11). Mesa de Partes lo entrega al ciudadano impreso o en PDF. Si el ciudadano lo pierde, se imprime un **duplicado**: es el mismo PDF, con el mismo código y el mismo QR, así que no se vuelve a firmar ni a registrar.

Antes de entregarlo, el servidor hace la misma comprobación que el portal público (HU21). Recupera el PDF de IPFS, recalcula su hash y lo compara con el registrado en el contrato. Solo entrega un documento **Válido**. Así, Mesa de Partes nunca imprime un documento alterado o anulado.

| Paso | Qué hace la persona |
|---|---|
| 1 | Busca el documento (HU22) y abre su ficha (HU23). Ve si está "Listo para entregar" o cuántas veces se entregó |
| 2 | Pulsa **Ver documento**, **Descargar PDF** o **Imprimir** |
| 3 | El historial (HU24) registra la descarga o la impresión. Desde la segunda impresión, como duplicado |

**Criterios de aceptación**

Los dos primeros son los de la Tabla 21 de la tesis. Los demás detallan cómo se cumplen.

- [ ] No se requiere una nueva firma.
  - Se entrega el PDF final guardado en IPFS, el mismo que se firmó: sin transacciones nuevas ni billetera.
  - Antes de entregarlo, el servidor comprueba que su hash es el registrado en el contrato y que no está anulado.
- [ ] Cada impresión queda registrada en el historial del documento.
  - La primera: "Impreso por {nombre} (Consulta interna)".
  - Las siguientes: "Duplicado impreso por {nombre} (Consulta interna). Impresión n.° {n}".
  - Cada descarga del PDF también se registra: "PDF descargado por {nombre} (Consulta interna)".
  - "Ver documento" solo muestra el PDF y no se registra.
- [ ] La ficha de un documento firmado tiene los botones **Ver documento**, **Descargar PDF** e **Imprimir**.
  - Muestra su estado de entrega: "Listo para entregar" si nunca se imprimió ni descargó; si no, "Entregado: impreso {n} veces, descargado {m} veces".
  - "Imprimir" abre el diálogo de impresión del navegador con el PDF.
  - "Descargar PDF" guarda el archivo con el código como nombre: `DRA-2026-F8R2MA.pdf`.
- [ ] Un documento que no está firmado (pendiente, observado, rechazado o anulado) no tiene esos botones. La API responde 409:
  - "Solo se entrega un documento firmado.";
  - si está anulado: "El documento está anulado: no se puede entregar.".
- [ ] Si el PDF no coincide con el registrado en la blockchain, no se entrega: 409 "El documento no coincide con su registro en la blockchain. No se puede entregar. Comuníquese con el Administrador." No se registra la entrega.
- [ ] Si IPFS o la blockchain no responden, se informa: 503 "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos."
- [ ] En Buscar documentos (HU22) se agrega el filtro **Listos para entregar**: firmados que nunca se imprimieron ni descargaron.
- [ ] Solo Consulta interna (permiso `DOCUMENTO_IMPRIMIR`) puede ver, descargar o imprimir. Sin sesión se responde 401 y con otro rol, 403.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Imprimir todo un lote de una vez ("Imprimir lote" del prototipo) | Pregunta abierta al PO: hoy se imprime certificado por certificado |
| Aviso a Mesa de Partes cuando hay documentos listos para entregar | HU28 |
| Indicadores "Impresos esta semana" y "Duplicados emitidos" del prototipo | Pregunta abierta al PO |

**Notas técnicas**

- API:
  - `GET /api/consulta/documentos/{codigo}/pdf`: ver el documento (inline, sin registrar);
  - `POST /api/consulta/documentos/{codigo}/entregas` con `{"forma": "IMPRESION" | "DESCARGA"}`: registra el evento y responde el PDF.
  - Ninguno se guarda en caché (`no-store`).
- Migración V21: los eventos `IMPRESO` y `DESCARGADO` en el historial.
- La comprobación reutiliza la del portal (`VerificacionDeAutenticidad`).

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

**Contexto**

Hasta ahora el Director tenía que entrar a "Por revisar" para enterarse de los documentos nuevos. Esta historia construye los **avisos dentro de la plataforma**: una campana en el encabezado con la cantidad sin leer y un panel con los avisos. HU27 y HU28 usarán los mismos avisos para el Área encargada y Mesa de Partes.

Un documento queda pendiente de revisión en cuatro casos, y en cada uno se avisa a los directores activos:

| Cuándo | Aviso | Abre |
|---|---|---|
| El área envía un documento a solicitud de parte (HU08) | "Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto" | El documento en Por revisar |
| El área envía un lote (HU09) | "Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)" | El lote en Por revisar |
| El área corrige y reenvía un observado (HU15) | "Documento corregido, pendiente de revisión: Certificado de Trabajo – Lucía Paredes Quinto" | El documento, o su lote |
| El área envía una reemisión (HU30) | "Reemisión pendiente: Certificado de Trabajo – Lucía Paredes Quintana (reemplaza a DRA-2026-F8R2MA)" | El documento en Por revisar |

**Criterios de aceptación**

El primero es el de la Tabla 22 de la tesis. Los demás detallan cómo se cumple.

- [ ] El aviso aparece dentro de la plataforma y abre el documento o lote correspondiente.
  - Al pulsarlo se marca como leído y se abre el documento (`#/por-revisar/{código}`) o el lote (`#/por-revisar/lote/{número}`), como desde la bandeja.
  - Un lote genera **un solo aviso**, no uno por certificado.
- [ ] El encabezado tiene una **campana** ("Avisos") para quien tiene el permiso `NOTIFICACIONES_VER`. Muestra la cantidad de avisos sin leer, o nada si no hay.
- [ ] La campana abre un **panel** con los 30 avisos más recientes:
  - cada uno con su texto y su antigüedad ("hace 5 min", "hace 2 h", "ayer", o la fecha);
  - un punto en los que no se leyeron;
  - el botón "Marcar todos como leídos";
  - sin avisos, el mensaje "No tiene avisos.".
  - Se cierra con Escape o al pulsar fuera.
- [ ] Los avisos nuevos aparecen sin recargar la página: se consultan al cambiar de pantalla, al abrir la campana y al volver a la ventana de la plataforma. No se consultan a intervalos, porque cada consulta cuenta como actividad y la sesión dejaría de cerrarse por inactividad (HU03).
- [ ] Cada aviso es de una persona: cada director tiene los suyos y los marca como leídos por su cuenta. Nadie ve ni marca los avisos de otra persona.
- [ ] El aviso se guarda en la misma transacción que el envío: si el envío falla, no hay aviso.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Avisos al Área encargada (firmado, observado, rechazado, anulado) | HU27 |
| Avisos a Mesa de Partes (listo para entregar, rechazado) | HU28 |
| Avisos por correo o por otro medio fuera de la plataforma | No está en la tesis: los avisos son internos (RF46) |
| Borrar avisos o guardarlos por un tiempo limitado | Pregunta abierta al PO: hoy se conservan todos |

**Notas técnicas**

- Migración V22: tabla `aviso` (destinatario, tipo, texto, enlace, creado_en, leido_en), con un índice por destinatario y fecha.
- API, con el permiso `NOTIFICACIONES_VER`:
  - `GET /api/avisos`: `{ avisos, sinLeer }`, los 30 más recientes de la persona;
  - `POST /api/avisos/{id}/lectura`: marca un aviso como leído;
  - `POST /api/avisos/lectura`: marca todos como leídos.
- Un aviso de otra persona responde 404, igual que uno inexistente.
- Servicio `Avisos` con un método por destinatario (directores, área, Mesa de Partes) para HU26–HU28.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF46 |

### HU27: Avisos de resultado al Área encargada

**Como** Área encargada, **quiero** recibir un aviso cuando un documento es firmado, observado, rechazado o anulado, **para** actuar en consecuencia.

**Contexto**

Con HU26 la plataforma ya tiene avisos y una campana en el encabezado. Esta historia avisa al **Área encargada** del resultado de lo que envió. El aviso llega a cada persona activa del área del documento (rol Área encargada), y no solo a quien lo registró, porque cualquiera del área puede corregirlo o reemitirlo.

| Cuándo | Aviso | Abre |
|---|---|---|
| Se firma un documento (HU11) | "Firmado: Certificado de Trabajo – Lucía Paredes Quinto" | El documento en Mis documentos |
| El Director lo observa (HU13) | "Observado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento, para corregirlo |
| El Director lo rechaza (HU14) | "Rechazado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento |
| Se anula en la blockchain (HU29), o al firmarse su reemisión (HU30) | "Anulado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: {motivo}" | El documento |

**Criterios de aceptación**

El primero es el de la Tabla 22 de la tesis. Los demás detallan cómo se cumple.

- [ ] El aviso incluye el motivo cuando corresponde y abre el documento.
  - La observación, el rechazo y la anulación llevan su motivo. Un motivo largo se corta en el aviso y se lee completo en el documento.
  - Al pulsarlo se marca como leído y se abre el documento en Mis documentos (`#/mis-documentos/{código}`). En un lote, se abre el lote (`#/mis-documentos/lote/{número}`).
- [ ] **Un lote genera un solo aviso** por firma o por decisión, con la cantidad de certificados:
  - "Lote 2026-001 – Manejo integrado de plagas en café: 3 certificados firmados";
  - "Lote 2026-001 – …: 2 certificados observados. Motivo: …".
  - Si la firma de un lote se confirma en partes (por ejemplo, la confirmación y la sincronización con la blockchain), el aviso de esa transacción se actualiza con la cantidad final y vuelve a quedar sin leer, en vez de repetirse.
- [ ] El aviso llega a cada persona activa del área del documento con el rol Área encargada. No llega a otras áreas, al Director ni a Mesa de Partes.
- [ ] El aviso se guarda en la misma transacción que el cambio de estado: si el cambio no se guarda, no hay aviso. Repetir una confirmación que ya se aplicó no genera otro aviso.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Avisos a Mesa de Partes (listo para entregar, rechazado) | HU28 |
| Avisar a una persona que ya no está en el área cuando se envió el documento | Pregunta abierta al PO: hoy se avisa a quienes están en el área en el momento del resultado |

**Notas técnicas**

- `TipoDeAviso`: FIRMADO, OBSERVADO, RECHAZADO y ANULADO.
- Migración V23: columna `clave` en `aviso`, única por destinatario. Un aviso con la misma clave se actualiza en lugar de repetirse. Las claves son la transacción para la firma de un lote y el cambio de estado para lo demás.
- Los avisos se crean donde ya se aplica cada cambio: la confirmación de la firma y la sincronización (`FirmaDeDocumentos.aplicar`), la anulación (`AnulacionDeDocumentos.aplicar`) y la revisión del Director (`RevisionDelDirector`).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Baja | 2 | 6 | RF47 |

### HU28: Avisos de entrega y rechazo a Mesa de Partes

**Como** personal de Mesa de Partes, **quiero** recibir un aviso cuando un documento está listo para su entrega o es rechazado, **para** imprimirlo o comunicar el rechazo al solicitante.

**Contexto**

Mesa de Partes recibe las solicitudes de los ciudadanos y les entrega los documentos. Con HU22–HU25 ya puede buscarlos, ver su estado e imprimirlos. Con HU26 y HU27 hay avisos dentro de la plataforma. Esta historia avisa a **Mesa de Partes** (cada persona activa con el rol Consulta interna) en los dos momentos en que debe actuar:

| Cuándo | Aviso | Abre |
|---|---|---|
| Se firma un documento a solicitud de parte (HU11), o una reemisión (HU30) | "Listo para entregar: Certificado de Trabajo – Lucía Paredes Quinto (expediente EXP-2026-005391)" | Su ficha, con los botones para imprimir (HU25) |
| Se firman certificados de un lote | "Listo para entregar: Lote 2026-001 – Manejo integrado de plagas en café: 3 certificados firmados" | Buscar documentos con el lote |
| El Director rechaza un documento a solicitud de parte (HU14) | "Rechazado: Certificado de Trabajo – Martha Rojas Inga (expediente EXP-2026-005401). Motivo: {motivo}" | Su ficha |
| El Director rechaza certificados de un lote | "Rechazado: Lote 2026-001 – …: 2 certificados rechazados. Motivo: {motivo}" | Buscar documentos con el lote y el filtro Rechazados |

**Criterios de aceptación**

El primero es el de la Tabla 22 de la tesis. Los demás detallan cómo se cumple.

- [ ] El aviso de rechazo incluye el motivo y el número de expediente.
  - Los certificados de un lote no tienen expediente (son de oficio): su aviso lleva el número de lote.
- [ ] Cuando un documento se firma, Mesa de Partes recibe el aviso "Listo para entregar", con el número de expediente. Al pulsarlo se abre su ficha (`#/buscar/{código}`) para imprimirlo.
- [ ] Un lote genera **un solo aviso** por firma o por rechazo, con la cantidad, que abre Buscar documentos con el número de lote. Si la firma de un lote se confirma en partes, el aviso se actualiza en vez de repetirse (como en HU27).
- [ ] La observación no se avisa a Mesa de Partes: el documento vuelve al área y sigue en trámite. La anulación tampoco: la avisa HU27 al área, y Mesa de Partes ve el estado en la ficha.
- [ ] El aviso llega a cada persona activa con el rol Consulta interna, y no a las áreas ni al Director. Se guarda en la misma transacción que el cambio de estado.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Avisar al ciudadano directamente (correo, SMS) | No está en la tesis: los avisos son internos |
| Avisar a Mesa de Partes de una anulación | Pregunta abierta al PO: hoy no se avisa |

**Notas técnicas**

- `TipoDeAviso.LISTO_PARA_ENTREGAR`, y RECHAZADO (el de HU27).
- `Avisos.aConsultaInterna(...)`, con la misma clave que HU27 para no repetir el aviso de la firma de un lote.
- Se crean en `AvisosDeResultado`, junto a los del área: al confirmar la firma y al rechazar.

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

**Contexto**

Un documento firmado está registrado en el contrato (HU11). Anularlo también se registra en la blockchain: la billetera del Director envía la anulación al contrato, y desde ese momento la verificación pública (HU19–HU21) lo muestra como anulado. El registro original no se borra. Como en el prototipo, se anula desde la pantalla **Documentos firmados**, con el botón "Anular" de cada documento (en un lote, de cada certificado).

| Paso (como en el prototipo) | Qué ocurre |
|---|---|
| Ventana de motivo | Título "Anular documento", motivo obligatorio y el aviso "La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad." El servidor guarda el motivo antes de ir a la blockchain |
| Billetera | Se verifica la billetera y la red (como en HU11). Luego se confirma "Anular 1 documento", sin costo |
| Progreso | "Verificando su billetera", "Registrando la anulación" y "Confirmando el registro" |
| Resultado | "Documento anulado", con el código y el beneficiario |

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 19 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Solo se anulan documentos firmados.
- [ ] El motivo es obligatorio.
- [ ] La anulación se confirma desde la billetera del director.
- [ ] El portal público muestra el documento como anulado. **El portal se construye en el Sprint 5 (HU19–HU21).** Esta historia deja la anulación en el contrato, consultable con `anulacion(codigo)`, y el estado Anulado en la plataforma.
- [ ] La pantalla **Documentos firmados** lista los firmados y anulados, del más reciente al más antiguo, con su código o lote, tipo, beneficiario y DNI, área, fecha de firma y estado. Se filtra por nombre o código, y los lotes se despliegan en sus certificados.
- [ ] El contrato solo acepta la anulación de un código registrado y no anulado, y solo de una billetera con el rol de firmante. El registro original no se modifica.
- [ ] El servidor solo marca un documento como **Anulado** después de leer la transacción en la blockchain. Se guardan la transacción, el bloque, la fecha del bloque, la billetera y quién anuló. El historial registra "Anulado por [Director]…" con el motivo.
- [ ] Si el Director cancela en la billetera o la transacción falla, el documento sigue Firmado y se descarta el motivo guardado.
- [ ] Si el navegador se cierra antes de confirmar, la sincronización (HU18) lee el evento `DocumentoAnulado` y marca el documento como Anulado, con el motivo guardado.
- [ ] El Área encargada ve el documento como **Anulado** (gris, tachado) en Mis documentos y, en el detalle, el motivo.
- [ ] Solo el Director (permiso DOCUMENTO_ANULAR) anula. Sin sesión se responde 401 y con otro rol, 403 (RF04).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Verificación pública que muestra "Anulado" | HU19–HU21 (Sprint 5) |
| Anulación automática del original al firmar su reemisión | HU30 |
| Búsqueda avanzada, historial y auditoría de los firmados | HU22–HU24 (Sprint 6) |

**Notas técnicas**

- Contrato:
  - `anularDocumento(string codigo)`, que emite `DocumentoAnulado`;
  - `anulacion(string codigo)` devuelve si está anulado y la fecha del bloque.
  - El motivo no va a la blockchain, porque puede contener datos personales. Queda en la base y en el historial.
- API:
  - `GET /api/firmados`;
  - `POST /api/anulacion/{codigo}/solicitud` con `{"motivo": "..."}`;
  - `POST /api/anulacion/{codigo}/confirmacion` con `{"transaccion": "0x…"}`;
  - `POST /api/anulacion/{codigo}/cancelacion`.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF49 |

### HU30: Reemitir un documento con datos corregidos

**Como** Área encargada, **quiero** reemitir un documento firmado con los datos corregidos, **para** reemplazarlo sin reiniciar el trámite.

**Contexto**

A veces un documento firmado tiene un error, por ejemplo un apellido mal escrito o una fecha equivocada. La reemisión crea un documento nuevo con los datos corregidos y lo vincula al original, sin que el interesado tenga que volver a Mesa de Partes. Mantiene el número de expediente del original y sigue el flujo normal de revisión y firma (HU10–HU15): el Director puede firmarla, observarla o rechazarla. Cuando el Director la firma, una misma transacción del contrato registra el nuevo documento y anula el original (RF51).

Como en el prototipo, se reemite con el botón "Reemitir con corrección". Está en el detalle de un documento firmado y, en el detalle de un lote, en la fila de cada certificado firmado.

| Paso (como en el prototipo) | Qué ocurre |
|---|---|
| Formulario | Aparece precargado con los datos del original y el aviso "Reemisión de [código]. Cuando el Director firme el nuevo documento, el original se anulará automáticamente." Además pide el campo **Motivo de la reemisión** |
| Envío | Se crea un documento nuevo, Pendiente, con otro código. El original sigue Firmado y muestra "Reemisión en revisión" |
| Revisión | En Por revisar aparece la etiqueta "Reemisión". En la revisión se lee "Este documento reemplaza a [código]", con la lista de cambios y el motivo |
| Firma | En una sola transacción se registra el nuevo documento y se anula el original. El original queda Anulado, con el aviso "Reemplazado por [código nuevo]" |

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 23 de la tesis. Los demás detallan cómo se cumplen.

- [ ] El formulario se precarga con los datos del original.
  - Un documento a solicitud de parte se reemite con los mismos campos y validaciones del registro (HU08). El número de expediente es el del original y no se cambia.
  - Un certificado de un lote se reemite como en HU15: solo cambian los nombres, los apellidos y el DNI. El certificado nuevo queda en el mismo lote. El DNI no se repite en otro certificado vigente del lote; el original no cuenta.
  - Debe cambiar al menos un dato: si no cambió nada, se avisa "Corrija al menos un dato del documento."
- [ ] El motivo de la reemisión es obligatorio, de hasta 500 caracteres.
- [ ] El director visualiza los cambios respecto al original.
  - En Por revisar, el documento lleva la etiqueta "Reemisión".
  - La revisión muestra "Este documento reemplaza a [código]", los cambios campo por campo ("Apellidos: Rojas Inga → Rojas Ingaruca") y el motivo.
  - En la relación de un lote, el certificado reemitido muestra "Reemisión de [código]" y sus cambios.
- [ ] Al firmarse, el original se anula en la misma transacción.
  - El contrato registra el documento nuevo, anula el original y guarda qué documento lo reemplaza.
  - Si el original no está registrado o ya está anulado, la transacción no se aplica.
- [ ] Solo se reemite un documento **Firmado** del área propia (permiso DOCUMENTO_REEMITIR). Mientras una reemisión siga en curso (Pendiente, Procesando firma u Observada), no se crea otra. Si el Director la rechaza, el original sigue Firmado y se puede volver a reemitir.
- [ ] Mientras la reemisión esté en curso, el Director no puede anular el original por separado (HU29). Recibe el aviso de que se anulará al firmar la reemisión.
- [ ] El servidor marca los dos cambios solo después de leer la transacción en la blockchain: la reemisión Firmada y el original Anulado.
  - El original guarda el motivo "Reemplazado por [código nuevo]. Motivo de la reemisión: [motivo]".
  - Si el navegador se cierra, la sincronización (HU18) aplica los dos cambios.
- [ ] Los historiales quedan vinculados:
  - el original registra REEMISION_SOLICITADA, con el código nuevo y el motivo;
  - la reemisión registra REGISTRADO como "Reemisión de [código]", con el motivo y los cambios;
  - al firmarse, el original registra ANULADO con "reemplazado por [código nuevo]".
- [ ] El Área encargada ve los dos documentos en Mis documentos. En el detalle del original se lee "Reemisión en revisión" y luego "Reemplazado por [código]"; en el de la reemisión, "Reemisión de [código]" y el motivo.
- [ ] Sin sesión se responde 401, y con otro rol u otra área, 403 (RF04, RF05).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| El portal público muestra "Reemplazado por [código]" | HU19–HU21 (Sprint 5). El contrato ya lo deja consultable con `reemplazadoPor(codigo)` |
| Avisos al área cuando se firma la reemisión | HU26–HU28 (Sprint 6) |
| Corregir los datos del evento de un lote (taller, fechas, lugar), que son comunes a todos sus certificados | No se reemite por certificado. Requiere una historia propia si el PO lo prioriza |

**Notas técnicas**

- Contrato:
  - `registrarReemisiones(string[] codigos, bytes32[] hashes, bytes32[] dniHmacs, string[] originales)`, con hasta 50 por transacción. Emite `DocumentoRegistrado`, `DocumentoAnulado` y `DocumentoReemplazado`.
  - `reemplazadoPor(string codigo)` devuelve el código del documento que lo reemplaza.
  - `registrarDocumentos` no cambia. Si en una selección hay reemisiones y documentos nuevos, se envían en operaciones separadas.
- Base de datos:
  - el documento guarda a cuál reemplaza y el motivo;
  - un índice único impide dos reemisiones en curso del mismo original;
  - el número de expediente es único entre los documentos que no son reemisiones.
- API:
  - `POST /api/documentos/{codigo}/reemision/vista-previa`;
  - `POST /api/documentos/{codigo}/reemision`, que recibe los datos del documento y `"motivo"`.
  - La revisión y la preparación de la firma indican de qué documento es reemisión y qué cambió.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 8 | 4 | RF50, RF51 |

---

# Sprint 7: propuestas del equipo

Historias propuestas por el equipo al revisar los flujos con el negocio (`docs/negocio/flujos-del-sistema.md`), aprobadas por el responsable del proyecto el 11/11/2026. No forman parte de las 30 historias de la tesis.

### DRA-59: Renombrar los roles

**Sprint 7 · propuesta del equipo, fuera del backlog original de la tesis.**

**Como** usuario de la plataforma, **quiero** que cada rol tenga un nombre que describa lo que hace, **para** entender sin explicaciones quién es quién.

**Contexto**

Al revisar los flujos para la reunión con el negocio (`docs/negocio/flujos-del-sistema.md`), noté que dos nombres de la tesis no describen bien lo que hace cada rol:
- **"Área encargada"** suena a una oficina, no a una persona;
- **"Consulta interna"** oculta que ese rol también **entrega** documentos: es Mesa de Partes.

**Nombres nuevos**

| Código interno (no cambia) | Nombre actual (tesis) | Nombre nuevo | Qué hace |
|---|---|---|---|
| `AREA_ENCARGADA` | Área encargada | **Administrador de área** | Registra, corrige y reemite los documentos de su área |
| `CONSULTA_INTERNA` | Consulta interna | **Mesa de Partes** | Busca todos los documentos, informa su estado y los entrega |
| `ADMINISTRADOR` | Administrador | Administrador (sin cambio) | Gestiona cuentas, áreas y la billetera del Director |
| `DIRECTOR` | Director | Director (sin cambio) | Revisa, observa, rechaza, firma y anula |

**Criterios de aceptación**

- [ ] Los nombres nuevos se ven en todas las pantallas: el formulario y la lista de **Usuarios**, **Billetera del director**, el **encabezado** (por ejemplo, "Administrador de área – Área de Capacitación"), la bienvenida de **Inicio** y el **Historial** de la ficha de un documento (el rol de quien hizo cada evento).
- [ ] Solo cambia el **nombre visible**. Los códigos internos (`AREA_ENCARGADA`, `CONSULTA_INTERNA`), los permisos, la regla de área (RF05) y el comportamiento de cada rol no cambian.
- [ ] Las cuentas existentes conservan su rol: nadie gana ni pierde permisos.
- [ ] **El historial no se reescribe:** los eventos de cuenta ya registrados conservan el texto con el que se guardaron (por ejemplo, "Rol: Director → Consulta interna"). Los nuevos usan los nombres nuevos.
- [ ] La descripción del rol Mesa de Partes deja de repetir su nombre: "Busca, consulta el historial, imprime y entrega documentos".
- [ ] Las pruebas del backend, del frontend y de punta a punta que buscan los nombres anteriores se actualizan y pasan.
- [ ] Se actualiza la documentación que describe las pantallas: los guiones de prueba de los Sprints 1 a 6 y de QA, el documento de flujos para el negocio, los README y el `CLAUDE.md`.

**Fuera del alcance**

| Tema | Por qué |
|---|---|
| El texto de las historias HU01–HU30 y de la tesis | Conservan los nombres originales (Tablas 17 a 23). Se agrega una tabla de equivalencias al inicio de este archivo |
| Los comentarios del código | Nombran los roles por su código interno y por las historias de la tesis; no se ven en pantalla |
| El rol "Mesa de Partes de área" | DRA-58, que se construye después con el nombre nuevo |

**Notas técnicas**

- Los nombres visibles salen de la columna `rol.nombre`. Migración **V24**: `UPDATE rol SET nombre = …` por código, y la descripción de Mesa de Partes.
- El frontend no tiene los nombres fijos: usa `rolNombre` de la sesión y de las cuentas, y el código `AREA_ENCARGADA` para mostrar el campo Área.
- El historial de cuentas guarda el texto del cambio en `usuario_historial.detalle` al momento del evento, por eso los eventos anteriores no cambian.

**Decisiones a validar**

1. **"Administrador de área" puede confundirse con "Administrador".** Lo eligió el equipo; alternativas si el negocio lo prefiere: "Emisor de área" o "Responsable de emisión".
2. Las historias y la tesis conservan los nombres originales, con una tabla de equivalencias.
3. Los guiones de prueba **sí** se actualizan, porque describen lo que se ve en pantalla y se usarán en la validación del PO (DRA-48).

| Prioridad | Puntos | Sprint | Ticket |
|---|---|---|---|
| Media | 2 | 7 | DRA-59 |
