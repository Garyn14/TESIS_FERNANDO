-- DRA-19 (HU08, RF11, RF16, RF17, RF20): documentos registrados por el Área encargada y su
-- historial. Un documento enviado queda Pendiente y no se modifica mientras está en revisión; los
-- demás estados se agregan con las historias de revisión y firma (Sprints 3 y 4).
CREATE TABLE documento (
    id                BIGSERIAL    PRIMARY KEY,
    -- Código de verificación DRA-AAAA-XXXXXX, sin caracteres que se confunden (RF16, RNF04).
    codigo            VARCHAR(15)  NOT NULL UNIQUE,
    -- Token aleatorio de 256 bits para el código QR, en Base64 URL sin relleno (RF16, RNF04).
    token_qr          VARCHAR(43)  NOT NULL UNIQUE,
    tipo_documento_id SMALLINT     NOT NULL REFERENCES tipo_documento (id),
    area_id           SMALLINT     NOT NULL REFERENCES area (id),
    origen            VARCHAR(20)  NOT NULL CHECK (origen IN ('SOLICITUD_PARTE', 'OFICIO')),
    estado            VARCHAR(20)  NOT NULL CHECK (estado IN ('PENDIENTE')),
    -- Número de expediente de Mesa de Partes; obligatorio para los de solicitud de parte (RF11).
    numero_expediente VARCHAR(15)  UNIQUE,
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    -- El DNI se imprime en el documento; a la blockchain solo va su HMAC-SHA256 (RF17, RNF03).
    dni               VARCHAR(8)   NOT NULL,
    dni_hmac          VARCHAR(64)  NOT NULL,
    -- Datos propios del tipo (cargo, fechas, cultivo...) y el texto armado con la plantilla.
    datos             JSONB        NOT NULL,
    texto             VARCHAR(1000) NOT NULL,
    registrado_por    BIGINT       NOT NULL REFERENCES usuario (id),
    registrado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (origen <> 'SOLICITUD_PARTE' OR numero_expediente IS NOT NULL)
);

-- Mis documentos: los del área, del más reciente al más antiguo (RF05).
CREATE INDEX documento_area_idx ON documento (area_id, registrado_en DESC);

CREATE TABLE documento_historial (
    id            BIGSERIAL    PRIMARY KEY,
    documento_id  BIGINT       NOT NULL REFERENCES documento (id),
    evento        VARCHAR(30)  NOT NULL CHECK (evento IN ('REGISTRADO')),
    detalle       VARCHAR(500),
    realizado_por BIGINT       NOT NULL REFERENCES usuario (id),
    realizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX documento_historial_documento_idx ON documento_historial (documento_id, realizado_en);
