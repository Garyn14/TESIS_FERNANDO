# E1: Gestión de usuarios, roles y áreas

**Objetivo:** Controlar quién accede a la plataforma y qué acciones puede realizar.
**Requerimientos:** RF01–RF09 · **Sprint:** 1 · **Fuente:** Tabla 17 de la tesis.

> RF09 (inicialización del sistema) no tiene historia de usuario: es una tarea técnica del Sprint 0.

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

**Criterios de aceptación**
- [ ] El menú muestra solo las vistas permitidas.
- [ ] Tres intentos fallidos bloquean la cuenta durante una hora.
- [ ] La sesión expira tras 30 minutos de inactividad.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 1 | RF02, RF04, RF05 |

## HU04: Cambiar o restablecer la contraseña

**Como** usuario del sistema, **quiero** cambiar mi contraseña y, ante un olvido, que el Administrador la restablezca, **para** mantener el control de mi acceso.

**Criterios de aceptación**
- [ ] El cambio exige la contraseña actual.
- [ ] La contraseña temporal debe cambiarse en el siguiente inicio de sesión.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Media | 3 | 1 | RF03 |

## HU05: Asignar el área a un usuario

**Como** Administrador, **quiero** asignar a cada usuario del Área encargada el área a la que pertenece, **para** que solo gestione los documentos que le corresponden.

**Criterios de aceptación**
- [ ] El área es obligatoria para ese rol.
- [ ] El usuario solo ve los documentos y tipos de documento de su área.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 1 | RF05, RF06 |

## HU06: Registrar la billetera del director y su rol de firmante

**Como** Administrador, **quiero** registrar la billetera del director y otorgarle el rol de firmante, **para** habilitar su firma en la plataforma.

**Criterios de aceptación**
- [ ] Se valida el formato y la unicidad de la billetera.
- [ ] El otorgamiento se confirma con la billetera de administrador del contrato.
- [ ] La revocación no invalida los documentos firmados antes.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 1 | RF07, RF08 |
