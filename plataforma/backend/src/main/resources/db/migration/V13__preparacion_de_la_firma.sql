-- DRA-25 (HU17, RF30): al firmar, cada documento se prepara antes de registrarlo en la blockchain.
-- Pasa a "Procesando firma", se genera su PDF final (HU16) y se guarda en el IPFS privado. Se
-- conservan el hash SHA-256 del PDF, su CID y la fecha de emisión impresa. Si IPFS falla, el
-- documento vuelve a Pendiente y el error queda en el historial.
ALTER TABLE documento DROP CONSTRAINT documento_estado_check;
ALTER TABLE documento ADD CONSTRAINT documento_estado_check
    CHECK (estado IN ('PENDIENTE', 'PROCESANDO_FIRMA'));

ALTER TABLE documento
    ADD COLUMN hash_pdf      VARCHAR(64),
    ADD COLUMN cid           VARCHAR(100),
    ADD COLUMN fecha_emision DATE,
    ADD COLUMN preparado_en  TIMESTAMPTZ;

-- El CID y el hash se guardan juntos: un PDF en IPFS siempre tiene el hash con que se registra.
ALTER TABLE documento ADD CONSTRAINT documento_pdf_completo_check
    CHECK ((cid IS NULL) = (hash_pdf IS NULL) AND (cid IS NULL) = (fecha_emision IS NULL));

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO'));

-- HU18 busca los documentos detenidos en "Procesando firma".
CREATE INDEX documento_procesando_idx ON documento (preparado_en) WHERE estado = 'PROCESANDO_FIRMA';
