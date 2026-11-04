-- DRA-23 (HU12, RF22, RF24–RF27): en la revisión de un lote, el Director observa o rechaza
-- certificados (algunos o todos) indicando un motivo. El observado vuelve al Área encargada para
-- corregirlo (HU15); el rechazo es definitivo. El motivo se guarda en el documento y en el historial.
ALTER TABLE documento DROP CONSTRAINT documento_estado_check;
ALTER TABLE documento ADD CONSTRAINT documento_estado_check
    CHECK (estado IN ('PENDIENTE', 'PROCESANDO_FIRMA', 'FIRMADO', 'OBSERVADO', 'RECHAZADO'));

ALTER TABLE documento ADD COLUMN motivo VARCHAR(500);
ALTER TABLE documento ADD CONSTRAINT documento_motivo_check
    CHECK (estado NOT IN ('OBSERVADO', 'RECHAZADO') OR motivo IS NOT NULL);

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA', 'OBSERVADO', 'RECHAZADO'));
