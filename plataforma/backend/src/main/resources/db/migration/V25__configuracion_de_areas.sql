-- DRA-60: el Administrador configura qué tipos de documento emite cada área (RF06), desde la
-- pantalla "Áreas y documentos". La relación area_tipo_documento existe desde V2; aquí se agregan el
-- permiso y el historial de cambios del catálogo, que DRA-61 (gestión de áreas) también usa.
INSERT INTO permiso (codigo, descripcion) VALUES
    ('CATALOGO_GESTIONAR', 'Configurar las áreas y los tipos de documento que emite cada una (DRA-60, DRA-61)');

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo = 'CATALOGO_GESTIONAR'
WHERE r.codigo = 'ADMINISTRADOR';

-- Cada cambio de la configuración: quién, cuándo y qué cambió, en lenguaje cotidiano. No se
-- modifica ni se elimina.
CREATE TABLE catalogo_historial (
    id            BIGSERIAL    PRIMARY KEY,
    area_id       SMALLINT     NOT NULL REFERENCES area (id),
    evento        VARCHAR(30)  NOT NULL,
    detalle       VARCHAR(300) NOT NULL,
    realizado_por BIGINT       NOT NULL REFERENCES usuario (id),
    realizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX catalogo_historial_reciente_idx ON catalogo_historial (realizado_en DESC, id DESC);
