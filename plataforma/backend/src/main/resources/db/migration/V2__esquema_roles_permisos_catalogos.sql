-- DRA-47 (RF09): estructura de roles, permisos, áreas, tipos de documento y cuentas de usuario.
-- Los datos iniciales de los catálogos están en V3. La primera cuenta de Administrador la crea
-- el inicializador del backend (InicializadorAdministrador), no una migración, para no guardar
-- contraseñas en el repositorio.

-- Roles del sistema (RF01). Un usuario tiene un único rol.
CREATE TABLE rol (
    id          SMALLSERIAL PRIMARY KEY,
    codigo      VARCHAR(30)  NOT NULL UNIQUE,
    nombre      VARCHAR(60)  NOT NULL,
    descripcion VARCHAR(255) NOT NULL
);

-- Catálogo de permisos (RF04): cada vista y cada servicio exige uno.
CREATE TABLE permiso (
    id          SMALLSERIAL PRIMARY KEY,
    codigo      VARCHAR(40)  NOT NULL UNIQUE,
    descripcion VARCHAR(255) NOT NULL
);

-- Asignación de permisos a roles, configurable en la base de datos (RF04).
CREATE TABLE rol_permiso (
    rol_id     SMALLINT NOT NULL REFERENCES rol (id),
    permiso_id SMALLINT NOT NULL REFERENCES permiso (id),
    PRIMARY KEY (rol_id, permiso_id)
);

-- Áreas de la agencia (RF06).
CREATE TABLE area (
    id     SMALLSERIAL PRIMARY KEY,
    codigo VARCHAR(30)  NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activa BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Tipos de documento que emite la agencia (sección 1.1.2 de la tesis).
CREATE TABLE tipo_documento (
    id        SMALLSERIAL PRIMARY KEY,
    codigo    VARCHAR(40)  NOT NULL UNIQUE,
    nombre    VARCHAR(100) NOT NULL UNIQUE,
    titulo    VARCHAR(20)  NOT NULL CHECK (titulo IN ('CERTIFICADO', 'CONSTANCIA')),
    -- SOLICITUD_PARTE: individual, con número de expediente. OFICIO: emisión por lista (lote).
    origen    VARCHAR(20)  NOT NULL CHECK (origen IN ('SOLICITUD_PARTE', 'OFICIO')),
    activo    BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Tipos de documento que cada área está autorizada a emitir (RF06).
CREATE TABLE area_tipo_documento (
    area_id           SMALLINT NOT NULL REFERENCES area (id),
    tipo_documento_id SMALLINT NOT NULL REFERENCES tipo_documento (id),
    PRIMARY KEY (area_id, tipo_documento_id)
);

-- Cuentas de usuario (RF01, RF02, RF03, RF06). La gestión completa se implementa en HU01–HU05.
CREATE TABLE usuario (
    id                     BIGSERIAL PRIMARY KEY,
    nombre_usuario         VARCHAR(50)  NOT NULL UNIQUE,
    nombre_completo        VARCHAR(150) NOT NULL,
    -- Hash adaptativo (RNF02); nunca la contraseña en claro.
    contrasena_hash        VARCHAR(100) NOT NULL,
    rol_id                 SMALLINT     NOT NULL REFERENCES rol (id),
    -- Obligatoria solo para el rol Área encargada (HU05); se valida en el servicio.
    area_id                SMALLINT     REFERENCES area (id),
    activo                 BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Contraseña temporal que debe cambiarse en el siguiente inicio de sesión (RF03).
    debe_cambiar_contrasena BOOLEAN     NOT NULL DEFAULT FALSE,
    creado_en              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
