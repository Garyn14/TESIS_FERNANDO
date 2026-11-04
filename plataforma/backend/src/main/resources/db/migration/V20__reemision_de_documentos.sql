-- DRA-31 (HU30, RF50, RF51): el Área encargada reemite un documento firmado con los datos
-- corregidos. La reemisión es un documento nuevo, vinculado al que reemplaza, que sigue el flujo
-- normal de revisión y firma. Al firmarse, una misma transacción del contrato la registra y anula
-- el original.
ALTER TABLE documento
    ADD COLUMN reemplaza_a      BIGINT REFERENCES documento (id),
    ADD COLUMN motivo_reemision VARCHAR(500);

ALTER TABLE documento ADD CONSTRAINT documento_reemision_completa_check
    CHECK ((reemplaza_a IS NULL) = (motivo_reemision IS NULL) AND reemplaza_a IS DISTINCT FROM id);

-- Una sola reemisión en curso (o ya firmada) por original. Una rechazada no cuenta: el original
-- sigue Firmado y se puede volver a reemitir.
CREATE UNIQUE INDEX documento_una_reemision_idx ON documento (reemplaza_a)
    WHERE reemplaza_a IS NOT NULL AND estado <> 'RECHAZADO';

-- La reemisión mantiene el número de expediente del original ("sin reiniciar el trámite"): el
-- número es único entre los documentos que no son reemisiones.
ALTER TABLE documento DROP CONSTRAINT documento_numero_expediente_key;
CREATE UNIQUE INDEX documento_expediente_original_idx ON documento (numero_expediente)
    WHERE reemplaza_a IS NULL;

-- El motivo de la anulación de un original reemplazado lleva el código nuevo y el motivo de la
-- reemisión (hasta 500 caracteres).
ALTER TABLE documento ALTER COLUMN motivo_anulacion TYPE VARCHAR(600);

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA', 'OBSERVADO', 'RECHAZADO', 'CORREGIDO', 'ANULADO',
                      'REEMISION_SOLICITADA'));
