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
| `config` | Seguridad (Spring Security, codificador de contraseñas) y cliente de Besu |
| `salud` | `/api/salud` |
| `usuarios` | Entidades y repositorios de roles y cuentas (se completa en HU01–HU06) |
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
| Administrador | `USUARIOS_GESTIONAR`, `BILLETERA_GESTIONAR`, `CUENTA_PROPIA` |
| Área encargada | `DOCUMENTO_REGISTRAR`, `DOCUMENTO_VER_AREA`, `DOCUMENTO_CORREGIR`, `DOCUMENTO_REEMITIR`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |
| Director | `DOCUMENTO_REVISAR`, `DOCUMENTO_FIRMAR`, `DOCUMENTO_OBSERVAR`, `DOCUMENTO_RECHAZAR`, `DOCUMENTO_ANULAR`, `DOCUMENTO_VER_FIRMADOS`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |
| Consulta interna | `DOCUMENTO_BUSCAR`, `AUDITORIA_VER`, `DOCUMENTO_IMPRIMIR`, `NOTIFICACIONES_VER`, `CUENTA_PROPIA` |

Las dos reglas de control interno de RF05 (el Área encargada solo ve su área, y quien registra no firma) **no son permisos**: se aplican en el código, sin importar lo que diga la configuración (HU05, HU11).

### Áreas iniciales (pendiente de validar)

La tesis no nombra las áreas de la agencia. Se cargaron las del prototipo y **hay que confirmarlas con el Product Owner**:

| Área | Tipos de documento que emite |
|---|---|
| Área de Capacitación | Certificado de Capacitación, Certificado de Reconocimiento |
| Área de Desarrollo Agrario | Constancia de Productor Activo |
| Área de Administración | Certificado de Prácticas, Certificado de Trabajo |

Si cambian, se corrige con una migración nueva (regla 2).
