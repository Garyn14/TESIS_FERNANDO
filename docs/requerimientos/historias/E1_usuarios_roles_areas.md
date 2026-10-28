# E1: Gestión de usuarios, roles y áreas

**Objetivo:** Controlar quién accede a la plataforma y qué acciones puede realizar.
**Requerimientos:** RF01–RF09 · **Sprint:** 1 · **Fuente:** Tabla 17 de la tesis.

> RF09 (inicialización del sistema) no tiene historia de usuario: es una tarea técnica del Sprint 0.

---

## HU01: Crear cuentas de usuario

**Como** Administrador, **quiero** crear cuentas de usuario y asignarles un rol, **para** controlar quién accede a la plataforma.

**Criterios de aceptación**
- [ ] Cada cuenta tiene un único rol.
- [ ] El nombre de usuario no se repite.
- [ ] La cuenta queda activa al crearse.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 1 | RF01 |

## HU02: Editar o desactivar cuentas

**Como** Administrador, **quiero** editar o desactivar cuentas, **para** mantener actualizado el personal autorizado.

**Criterios de aceptación**
- [ ] La desactivación no elimina la cuenta ni su historial.
- [ ] Un usuario desactivado no puede iniciar sesión.

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
