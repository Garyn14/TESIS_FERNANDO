-- DRA-27 (HU13): el detalle del historial de una observación o un rechazo es "Observado por
-- [Director]: [motivo]". Con un motivo de 500 caracteres (el máximo, HU12) el texto superaba los 500
-- de la columna; se amplía para que entre completo.
ALTER TABLE documento_historial ALTER COLUMN detalle TYPE VARCHAR(1000);
