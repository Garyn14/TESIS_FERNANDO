-- DRA-22 (HU11, RF23, RF28–RF32): la billetera del Director registra los documentos en el contrato
-- y el servidor, después de leer la transacción en la blockchain, los pasa a Firmado. Se guardan la
-- transacción, el bloque, la billetera que firmó y la fecha del bloque, que es la fecha oficial de
-- emisión (RF32). Si la firma no se completa, el documento vuelve a Pendiente (FIRMA_CANCELADA).
ALTER TABLE documento DROP CONSTRAINT documento_estado_check;
ALTER TABLE documento ADD CONSTRAINT documento_estado_check
    CHECK (estado IN ('PENDIENTE', 'PROCESANDO_FIRMA', 'FIRMADO'));

ALTER TABLE documento
    ADD COLUMN firmado_por        BIGINT REFERENCES usuario (id),
    ADD COLUMN firmado_en         TIMESTAMPTZ,
    ADD COLUMN transaccion        VARCHAR(66),
    ADD COLUMN bloque             BIGINT,
    ADD COLUMN billetera_firmante VARCHAR(42);

-- Un documento firmado tiene su PDF en IPFS y su registro en la blockchain.
ALTER TABLE documento ADD CONSTRAINT documento_firmado_completo_check
    CHECK (estado <> 'FIRMADO' OR (cid IS NOT NULL AND transaccion IS NOT NULL
           AND bloque IS NOT NULL AND firmado_en IS NOT NULL AND billetera_firmante IS NOT NULL));

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA'));

-- Documentos firmados, del más reciente al más antiguo (HU22).
CREATE INDEX documento_firmados_idx ON documento (firmado_en DESC) WHERE estado = 'FIRMADO';
