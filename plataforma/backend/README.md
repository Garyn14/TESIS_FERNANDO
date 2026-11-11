# Backend

API de la plataforma: Java 21 + Spring Boot 4.1, PostgreSQL con Spring Data JPA y Flyway, y web3j para Besu. Stack definido en [ADR-001](../../docs/arquitectura/ADR-001-stack-tecnico.md).

```bash
./mvnw spring-boot:run      # levantar (requiere PostgreSQL: ver plataforma/README.md)
./mvnw verify               # formato + compilación + pruebas (requiere Docker)
./mvnw spotless:apply       # formatear el código
```

## Estructura

| Paquete | Contenido |
|---|---|
| `config` | Seguridad (Spring Security, permisos por método, codificador de contraseñas) y cliente de Besu |
| `sesion` | Inicio y cierre de sesión, bloqueo por intentos, validación de la cuenta en cada solicitud y CSRF (HU03) |
| `areas` | Áreas y tipos de documento; regla de control interno de RF05 (`AlcanceDeArea`) (HU05) |
| `billeteras` | Billetera del director (RF07) y verificación de los cambios del rol de firmante (RF08) (HU06) |
| `blockchain` | Lectura del contrato RegistroDocumentos con web3j: estado de los roles y recibos de transacción. Nunca envía transacciones (RNF05) |
| `comun` | Formato único de errores de la API y validador de solicitudes |
| `salud` | `/api/salud` |
| `usuarios` | Roles y cuentas: creación y listado (HU01); edición, desactivación, reactivación e historial (HU02); se completa en HU03–HU06 |
| `inicializacion` | Procedimiento de inicialización (RF09) |

## Base de datos y migraciones (Flyway)

El esquema de PostgreSQL **solo cambia mediante migraciones de Flyway**. Hibernate está en `ddl-auto: validate`: no crea ni modifica tablas, solo comprueba al arrancar que las entidades coinciden con el esquema. Si no coinciden, el backend no arranca.

- **Carpeta:** `src/main/resources/db/migration/`
- **Cuándo se aplican:** automáticamente al arrancar el backend, en orden de versión. Flyway registra cada una en la tabla `flyway_schema_history`.
- **Pruebas:** cada `./mvnw verify` y cada ejecución de la CI aplica todas las migraciones desde cero sobre un PostgreSQL 17 real (Testcontainers).

### Reglas

1. **Nombre:** `V<número>__<descripcion_en_minusculas>.sql`, con el número siguiente al último existente y dos guiones bajos. Ejemplo: `V4__tabla_documento.sql`.
2. **Nunca modificar una migración ya integrada a `main`.** Flyway guarda un checksum de cada una. Si cambia, el backend no arranca en las bases que ya la aplicaron. Cualquier corrección va en una migración **nueva**.
3. **Una migración por cambio lógico,** y en el commit la clave de Jira de la historia que la motiva: `DRA-12 Crea la tabla de auditoría de cuentas`.
4. **Estructura y datos por separado.** Las tablas (DDL) van en una migración y los datos de catálogo (INSERT) en otra, como V2 y V3.
5. **Comentar el porqué** al inicio del archivo, con la historia o el requerimiento que la origina.
6. **Nada de secretos ni datos personales en las migraciones.** Contraseñas, claves o DNI reales nunca se escriben en SQL. Por eso la primera cuenta de Administrador la crea el inicializador, no una migración.
7. **Cambios compatibles con la versión anterior** cuando sea posible: primero agregar una columna con valor por defecto, después usarla, y recién al final eliminar la anterior.

### Migraciones existentes

| Versión | Archivo | Contenido | Tarea |
|---|---|---|---|
| V1 | `V1__base.sql` | Extensión `pgcrypto` | DRA-43 |
| V2 | `V2__esquema_roles_permisos_catalogos.sql` | Tablas `rol`, `permiso`, `rol_permiso`, `area`, `tipo_documento`, `area_tipo_documento`, `usuario` | DRA-47 (RF09) |
| V3 | `V3__datos_iniciales_catalogos.sql` | 4 roles, 17 permisos con su asignación inicial (22), 5 tipos de documento, 3 áreas y los tipos que emite cada una | DRA-47 (RF09) |
| V4 | `V4__usuario_creado_por_y_unicidad.sql` | Columna `usuario.creado_por` e índice único de `lower(nombre_usuario)` | DRA-12 (HU01) |
| V5 | `V5__historial_de_cuentas.sql` | Tabla `usuario_historial`, cargada con el evento de creación de las cuentas existentes | DRA-13 (HU02) |
| V6 | `V6__bloqueo_por_intentos_fallidos.sql` | Columnas `usuario.intentos_fallidos` y `usuario.bloqueada_hasta`; evento `BLOQUEADA` en el historial | DRA-14 (HU03) |
| V7 | `V7__cambio_y_restablecimiento_de_contrasena.sql` | Columna `usuario.contrasena_cambiada_en`; eventos `CONTRASENA_CAMBIADA` y `CONTRASENA_RESTABLECIDA`; `evento` pasa a 30 caracteres | DRA-15 (HU04) |
| V8 | `V8__billetera_del_director.sql` | Columna `usuario.billetera` (única sin distinguir mayúsculas) y eventos `BILLETERA_REGISTRADA`, `FIRMANTE_OTORGADO` y `FIRMANTE_REVOCADO` | DRA-17 (HU06) |

## API

Cada servicio exige un permiso con `@PreAuthorize` (RF04). Sin sesión responde **401**; con sesión pero sin el permiso, **403**.

### Sesión (HU03)

| Aspecto | Cómo funciona |
|---|---|
| Sesión | Del servidor (cookie `JSESSIONID`, HttpOnly, SameSite=Lax). El identificador cambia al iniciar sesión |
| Inactividad | 30 minutos (`SESION_INACTIVIDAD`, solo se cambia para pruebas) |
| CSRF | Cookie `XSRF-TOKEN`, que el frontend devuelve en la cabecera `X-XSRF-TOKEN` en cada POST, PUT o DELETE. Se renueva al iniciar sesión |
| Permisos | Se vuelven a leer de la base de datos **en cada solicitud**. Si la cuenta se desactiva, la sesión se cierra; si cambia de rol, rigen los permisos nuevos |
| Intentos fallidos | Tres seguidos bloquean la cuenta una hora (evento `BLOQUEADA`). Un ingreso correcto reinicia el contador. Durante el bloqueo no se evalúa la contraseña |
| Mensajes | Usuario inexistente y contraseña incorrecta dan el mismo mensaje (401), y en ambos casos se calcula un hash para que tarden lo mismo. Cuenta bloqueada: 423, con la hora de fin. Cuenta desactivada: 403, solo si la contraseña es correcta |
| Contraseña temporal | Con `debe_cambiar_contrasena`, el servidor responde 403 "Debe cambiar su contraseña temporal antes de continuar" a todo salvo `GET` y `DELETE /api/sesion` y `PUT /api/sesion/contrasena` (HU04) |
| Cambio de contraseña | Cada sesión guarda el momento del último cambio que conoce. Si `contrasena_cambiada_en` es posterior (cambio desde otra sesión o restablecimiento), la sesión se cierra en su siguiente solicitud. La sesión que hizo el cambio se actualiza y sigue activa (HU04) |
| 401 sin sesión | "Inicie sesión para continuar.", "Su sesión expiró por inactividad..." si la cookie ya no es válida, "Su cuenta fue desactivada...", "El Administrador restableció su contraseña..." o "Su contraseña se cambió en otra sesión..." |

| Método y ruta | Permiso | Descripción | Historia |
|---|---|---|---|
| `GET /api/salud` | Público | Estado del backend | DRA-43 |
| `POST /api/sesion` | Público | Inicia sesión con usuario y contraseña. Devuelve el rol y los permisos | HU03 |
| `GET /api/sesion` | Con sesión | Sesión actual. Sin sesión responde 401 con el motivo | HU03 |
| `DELETE /api/sesion` | Con sesión | Cierra la sesión en el servidor | HU03 |
| `PUT /api/sesion/contrasena` | `CUENTA_PROPIA` | Cambia la contraseña propia; exige la actual | HU04 |
| `GET /api/usuarios` | `USUARIOS_GESTIONAR` | Lista las cuentas, la más reciente primero. Nunca incluye la contraseña | HU01 |
| `POST /api/usuarios` | `USUARIOS_GESTIONAR` | Crea una cuenta activa con contraseña temporal. Responde 201 | HU01 |
| `GET /api/roles` | `USUARIOS_GESTIONAR` | Roles para el formulario de la cuenta | HU01 |
| `PUT /api/usuarios/{id}` | `USUARIOS_GESTIONAR` | Edita el nombre completo y el rol | HU02 |
| `POST /api/usuarios/{id}/desactivar` | `USUARIOS_GESTIONAR` | Quita el acceso sin borrar la cuenta | HU02 |
| `POST /api/usuarios/{id}/reactivar` | `USUARIOS_GESTIONAR` | Devuelve el acceso con el mismo rol | HU02 |
| `POST /api/usuarios/{id}/restablecer-contrasena` | `USUARIOS_GESTIONAR` | Asigna una contraseña temporal; desbloquea la cuenta y cierra sus sesiones | HU04 |
| `GET /api/areas` | `USUARIOS_GESTIONAR` | Áreas activas con los tipos de documento que emite cada una | HU05 |
| `GET /api/tipos-documento` | `DOCUMENTO_REGISTRAR` | Tipos que la sesión puede registrar: para el Emisor de área, solo los de su área (RF05) | HU05 |
| `GET /api/billeteras` | `BILLETERA_GESTIONAR` | Directores (y cuentas con billetera) con el estado de firmante leído de la blockchain | HU06 |
| `PUT /api/billeteras/{idCuenta}` | `BILLETERA_GESTIONAR` | Registra la billetera del director: formato, suma de verificación EIP-55, unicidad, solo Director, no administradora del contrato y sin cambiarla mientras sea firmante | HU06 |
| `POST /api/billeteras/{idCuenta}/firmante` | `BILLETERA_GESTIONAR` | Recibe el identificador de una transacción firmada en el navegador, la verifica en la blockchain y la registra en el historial (sin duplicar) | HU06 |
| `GET /api/blockchain/red` | `CUENTA_PROPIA` | chainId, nombre y URL de la red, y dirección del contrato, para la billetera del navegador | HU06 |
| `GET /api/catalogo` | `CATALOGO_GESTIONAR` | Pantalla "Áreas y documentos": las áreas (activas y deshabilitadas) con sus tipos y sus personas activas, los tipos asignables y los 30 cambios más recientes | DRA-60, DRA-61 |
| `PUT /api/catalogo/areas/{area}/tipos-documento/{tipo}` | `CATALOGO_GESTIONAR` | Asigna un tipo de documento a un área; si ya estaba, responde 409 sin cambiar nada | DRA-60 |
| `DELETE /api/catalogo/areas/{area}/tipos-documento/{tipo}` | `CATALOGO_GESTIONAR` | Quita un tipo a un área: solo impide registrar documentos nuevos de ese tipo; si no estaba, responde 409 | DRA-60 |
| `POST /api/catalogo/areas` | `CATALOGO_GESTIONAR` | Crea un área activa y sin tipos (`{"nombre"}`, 3 a 100 caracteres, único sin mayúsculas ni tildes: si no, 409). El código sale del nombre y no cambia | DRA-61 |
| `PUT /api/catalogo/areas/{area}` | `CATALOGO_GESTIONAR` | Cambia el nombre de un área activa; lo ya guardado como texto conserva el nombre anterior | DRA-61 |
| `POST /api/catalogo/areas/{area}/deshabilitar` | `CATALOGO_GESTIONAR` | Deshabilita un área sin personas activas (si tiene, 409 con la cantidad). No registra documentos nuevos; lo registrado sigue su trámite. No existe la operación de eliminar | DRA-61 |
| `POST /api/catalogo/areas/{area}/reactivar` | `CATALOGO_GESTIONAR` | Reactiva un área deshabilitada, con los tipos que conservaba | DRA-61 |
| `GET /api/documentos/{codigo}/formulario` | `DOCUMENTO_VER_AREA` | Formulario del tipo del propio documento, para corregirlo o reemitirlo aunque el tipo ya no esté asignado al área | DRA-60 |
| `POST /api/documentos/{codigo}/correccion/vista-previa` | `DOCUMENTO_CORREGIR` | Vista previa de la corrección de un observado, con el tipo del propio documento | DRA-60 |

No hay ninguna ruta para eliminar cuentas (RF01): `DELETE` responde 405.

Los errores siempre tienen la misma forma:

```json
{ "mensaje": "Revise los datos ingresados.",
  "campos": { "nombreUsuario": "El nombre de usuario ya está registrado." } }
```

| Código | Cuándo |
|---|---|
| 400 | Algún campo no cumple sus reglas o el rol no existe |
| 404 | La cuenta no existe |
| 409 | El nombre de usuario ya existe (sin distinguir mayúsculas), el Administrador intenta desactivarse o cambiarse el rol, o se dejaría el sistema sin Administradores activos |

Reglas de la cuenta (HU01): el nombre de usuario se pasa a minúsculas y debe tener de 4 a 30 caracteres (letras sin tildes, números, punto o guion bajo, empezando con una letra). El nombre completo debe tener de 3 a 150 caracteres. La contraseña temporal, de 8 a 20 (RNF02); se guarda con BCrypt y la cuenta queda marcada para cambiarla en el primer inicio de sesión (RF03). Se guarda quién creó la cuenta (`creado_por`).

Reglas de edición y desactivación (HU02):
- El nombre de usuario no se edita.
- Desactivar o reactivar una cuenta que ya está en ese estado no hace nada, y editar sin cambios tampoco registra eventos.
- Quien gestiona no puede desactivar su propia cuenta ni cambiarse el rol.
- Siempre debe quedar al menos un Administrador activo. Las cuentas de Administrador activas se bloquean durante la verificación para que dos solicitudes simultáneas no dejen el sistema sin ninguno.
- Cada creación, edición, desactivación y reactivación se guarda en `usuario_historial` con quién la hizo, cuándo y qué cambió.

> Las pruebas de HU01 y HU02 simulan la sesión con `@WithMockUser`. Las de HU03 (`sesion/`) usan sesiones reales, y la prueba de punta a punta (`plataforma/e2e`) recorre todo desde el navegador.

## Blockchain (HU06)

El backend **lee** el contrato `RegistroDocumentos` con web3j (`eth_call` y recibos de transacción) y **nunca envía transacciones** ni guarda claves (RNF05). Las transacciones las firma la billetera del Administrador en el navegador. El backend recibe solo su identificador y comprueba en la blockchain que:

- se haya confirmado;
- sea del contrato de la plataforma;
- contenga el evento `RoleGranted` o `RoleRevoked` del rol de firmante para esa billetera.

El estado "firmante" se lee siempre del contrato (RNF10). Si la blockchain no responde, `GET /api/billeteras` devuelve `blockchainDisponible: false` y ningún estado, y los cambios que necesitan comprobar el contrato responden 503.

| Variable | Por defecto | Uso |
|---|---|---|
| `BESU_RPC_URL` | `http://localhost:8545` | Nodo que consulta el backend |
| `PLATAFORMA_CONTRATO_DIRECCION` | *(vacía)* | Dirección de `RegistroDocumentos` (ver `plataforma/contracts/README.md`). Sin ella, la pantalla avisa que el contrato no está configurado |
| `BESU_RPC_PUBLICA` | `http://localhost:8545` | URL del nodo que se propone a la billetera del navegador |
| `BESU_CHAIN_ID` / `BESU_NOMBRE_RED` | `20260` / `Plataforma DRA Satipo` | Red que se propone a la billetera |

Las llamadas al contrato se arman con `FunctionEncoder` de web3j, sin envoltorios generados, porque por ahora el backend usa dos funciones de lectura. Si con el registro de documentos (HU18) crecen, se generarán los envoltorios desde el ABI de Hardhat, como prevé el ADR-001.

## Inicialización del sistema (RF09)

RF09: *"un procedimiento de inicialización que cree la primera cuenta de Administrador, el catálogo de áreas y tipos de documento, y el catálogo de permisos con su asignación inicial a cada rol."*

| Parte | Cómo se cumple |
|---|---|
| Catálogo de áreas y tipos de documento | Migración V3 |
| Catálogo de permisos y su asignación a cada rol | Migración V3 |
| Primera cuenta de Administrador | `InicializadorAdministrador`, al arrancar el backend |

### Primera cuenta de Administrador

Al arrancar, el backend revisa si existe alguna cuenta con rol `ADMINISTRADOR`:

| Situación | Resultado |
|---|---|
| Ya existe un Administrador | No hace nada. Es idempotente: se puede reiniciar sin crear duplicados |
| No existe y `PLATAFORMA_ADMIN_CONTRASENA` está definida | Crea la cuenta con la contraseña hasheada (BCrypt, RNF02) y la marca como **temporal**: hay que cambiarla en el primer inicio de sesión (RF03) |
| No existe y la contraseña no está definida | Arranca igual y deja un aviso en el registro |
| La contraseña no tiene entre 8 y 20 caracteres | **No arranca** y explica el motivo (RNF02) |

| Variable | Por defecto | Uso |
|---|---|---|
| `PLATAFORMA_ADMIN_USUARIO` | `admin` | Nombre de usuario |
| `PLATAFORMA_ADMIN_NOMBRE` | `Administrador de la plataforma` | Nombre completo |
| `PLATAFORMA_ADMIN_CONTRASENA` | *(vacía)* | Contraseña temporal. **No se versiona**: en producción va en AWS Secrets Manager (DRA-44) |

Procedimiento para un entorno nuevo:

```bash
PLATAFORMA_ADMIN_CONTRASENA='<temporal de 8 a 20 caracteres>' ./mvnw spring-boot:run
# En el registro: "Inicialización: se creó la cuenta de Administrador 'admin'..."
# Después se puede quitar la variable: los siguientes arranques no crean otra cuenta.
```

### Asignación inicial de permisos

Se basa en los roles del prototipo validado (`docs/diseno/prototipo_plataforma_interna.md`, sección 3). Es **configurable** (RF04): se cambia con una nueva migración o, más adelante, desde la gestión del Administrador.

| Rol | Permisos |
|---|---|
| Administrador | `USUARIOS_GESTIONAR`, `BILLETERA_GESTIONAR`, `CATALOGO_GESTIONAR`, `CUENTA_PROPIA` |
| Emisor de área | `DOCUMENTO_REGISTRAR`, `DOCUMENTO_VER_AREA`, `DOCUMENTO_CORREGIR`, `DOCUMENTO_REEMITIR`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |
| Director | `DOCUMENTO_REVISAR`, `DOCUMENTO_FIRMAR`, `DOCUMENTO_OBSERVAR`, `DOCUMENTO_RECHAZAR`, `DOCUMENTO_ANULAR`, `DOCUMENTO_VER_FIRMADOS`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |
| Mesa de Partes | `DOCUMENTO_BUSCAR`, `AUDITORIA_VER`, `DOCUMENTO_IMPRIMIR`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |

Las dos reglas de control interno de RF05 (el Emisor de área solo ve su área, y quien registra no firma) **no son permisos**: se aplican en el código, sin importar lo que diga la configuración (HU05, HU11).

La primera está en un solo componente, `areas/AlcanceDeArea` (HU05). Hoy limita los tipos de documento; las historias de documentos del Sprint 2 deben usarlo también para filtrar los documentos. El rol Emisor de área exige un área activa al crear o editar la cuenta. Para los demás roles el área queda vacía.

### Áreas iniciales (pendiente de validar)

La tesis no nombra las áreas de la agencia. Se cargaron las del prototipo y **hay que confirmarlas con el Product Owner**:

| Área | Tipos de documento que emite |
|---|---|
| Área de Capacitación | Certificado de Capacitación, Certificado de Reconocimiento |
| Área de Desarrollo Agrario | Constancia de Productor Activo |
| Área de Administración | Certificado de Prácticas, Certificado de Trabajo |

Si cambian, se corrige con una migración nueva (regla 2).
