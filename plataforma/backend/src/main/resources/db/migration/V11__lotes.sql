-- DRA-20 (HU09, RF13, RF19): emisión por lista. Los datos del evento se ingresan una vez en el
-- lote, y cada beneficiario recibe su propio documento, con su código, token y HMAC (RF16, RF17).
CREATE TABLE lote (
    id                BIGSERIAL    PRIMARY KEY,
    -- Número correlativo por año: 2026-001, 2026-002... Se muestra como "Lote 2026-001".
    numero            VARCHAR(10)  NOT NULL UNIQUE,
    tipo_documento_id SMALLINT     NOT NULL REFERENCES tipo_documento (id),
    area_id           SMALLINT     NOT NULL REFERENCES area (id),
    -- Datos del evento (taller, fechas, lugar...) y el texto común a todos sus certificados.
    datos             JSONB        NOT NULL,
    texto             VARCHAR(1000) NOT NULL,
    registrado_por    BIGINT       NOT NULL REFERENCES usuario (id),
    registrado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE documento ADD COLUMN lote_id BIGINT REFERENCES lote (id);
-- Un documento de oficio siempre pertenece a un lote; uno a solicitud de parte, nunca.
ALTER TABLE documento ADD CONSTRAINT documento_lote_segun_origen
    CHECK ((origen = 'OFICIO') = (lote_id IS NOT NULL));

CREATE INDEX documento_lote_idx ON documento (lote_id);
