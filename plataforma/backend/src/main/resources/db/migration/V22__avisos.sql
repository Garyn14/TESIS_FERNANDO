-- DRA-39 (HU26, RF46–RF48): avisos dentro de la plataforma. Cada aviso es de una persona, que lo
-- marca como leído por su cuenta. Se guarda en la misma transacción que el hecho que lo origina.
CREATE TABLE aviso (
    id              BIGSERIAL    PRIMARY KEY,
    destinatario_id BIGINT       NOT NULL REFERENCES usuario (id),
    -- HU26: PENDIENTE_REVISION. HU27 y HU28 agregan los suyos.
    tipo            VARCHAR(30)  NOT NULL,
    texto           VARCHAR(300) NOT NULL,
    -- Ruta de la plataforma que abre el aviso, sin el "#/": por-revisar/DRA-2026-F8R2MA.
    enlace          VARCHAR(100) NOT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    leido_en        TIMESTAMPTZ
);

CREATE INDEX aviso_destinatario_idx ON aviso (destinatario_id, creado_en DESC);
