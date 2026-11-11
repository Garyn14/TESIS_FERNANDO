# E1: Gestión de usuarios, roles y áreas

**Objetivo:** Controlar quién accede a la plataforma y qué acciones puede realizar.
**Requerimientos:** RF01–RF09 · **Sprint:** 1 · **Fuente:** Tabla 17 de la tesis.

> RF09 (inicialización del sistema) no tiene historia de usuario: es una tarea técnica del Sprint 0.

> **Nombres de los roles desde el Sprint 7 (DRA-59).** Las historias HU01–HU30 conservan los nombres de la tesis. En la plataforma, **"Área encargada"** se llama **"Administrador de área"** y **"Consulta interna"** se llama **"Mesa de Partes"**. Los códigos internos (`AREA_ENCARGADA`, `CONSULTA_INTERNA`) no cambian.

---

## HU01: Crear cuentas de usuario

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

## HU02: Editar o desactivar cuentas

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

## HU03: Iniciar sesión según el rol

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

## HU04: Cambiar o restablecer la contraseña

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

## HU05: Asignar el área a un usuario

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

## HU06: Registrar la billetera del director y su rol de firmante

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

## DRA-59: Renombrar los roles

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
