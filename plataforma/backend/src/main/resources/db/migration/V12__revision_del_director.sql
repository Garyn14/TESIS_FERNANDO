-- DRA-21 (HU10, RF21, RF22): el Director revisa los documentos pendientes. Se registra quién
-- revisó cada documento y cuándo; la firma (HU11) solo deja seleccionar los ya revisados.
ALTER TABLE documento
    ADD COLUMN revisado_por BIGINT REFERENCES usuario (id),
    ADD COLUMN revisado_en  TIMESTAMPTZ;

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO'));

-- Bandeja "Por revisar": los pendientes, del más antiguo al más reciente (RF21).
CREATE INDEX documento_pendientes_idx ON documento (registrado_en) WHERE estado = 'PENDIENTE';
