-- DRA-40 (HU27, RF47): los avisos de resultado al Área encargada. Un aviso con la misma clave se
-- actualiza en lugar de repetirse: así, la firma de un lote que se confirma en partes deja un solo
-- aviso con la cantidad final.
ALTER TABLE aviso ADD COLUMN clave VARCHAR(150);
CREATE UNIQUE INDEX aviso_clave_idx ON aviso (destinatario_id, clave) WHERE clave IS NOT NULL;
