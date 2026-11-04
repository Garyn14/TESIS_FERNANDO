-- DRA-30 (HU29, RF49): el Director anula un documento firmado con su billetera. El motivo se guarda
-- primero (solicitud) y el documento pasa a Anulado solo cuando el servidor lee la transacción en la
-- blockchain, o cuando la sincronización (HU18) lee el evento DocumentoAnulado. El motivo no va a la
-- blockchain: puede tener datos personales.
ALTER TABLE documento DROP CONSTRAINT documento_estado_check;
ALTER TABLE documento ADD CONSTRAINT documento_estado_check
    CHECK (estado IN ('PENDIENTE', 'PROCESANDO_FIRMA', 'FIRMADO', 'OBSERVADO', 'RECHAZADO',
                      'ANULADO'));

ALTER TABLE documento
    ADD COLUMN motivo_anulacion        VARCHAR(500),
    ADD COLUMN anulacion_solicitada_en TIMESTAMPTZ,
    ADD COLUMN anulado_por             BIGINT REFERENCES usuario (id),
    ADD COLUMN anulado_en              TIMESTAMPTZ,
    ADD COLUMN transaccion_anulacion   VARCHAR(66),
    ADD COLUMN bloque_anulacion        BIGINT;

-- Un documento anulado tiene su anulación leída en la blockchain y su motivo.
ALTER TABLE documento ADD CONSTRAINT documento_anulado_completo_check
    CHECK (estado <> 'ANULADO' OR (motivo_anulacion IS NOT NULL AND anulado_en IS NOT NULL
           AND transaccion_anulacion IS NOT NULL AND bloque_anulacion IS NOT NULL));

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA', 'OBSERVADO', 'RECHAZADO', 'CORREGIDO', 'ANULADO'));
