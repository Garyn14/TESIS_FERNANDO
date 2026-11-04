-- DRA-29 (HU15, RF20, RF25): el Área encargada corrige un documento observado y lo reenvía. Vuelve
-- a Pendiente con su mismo código, sin la revisión anterior, y con la etiqueta "Corregido" en la
-- bandeja del Director. Los cambios quedan en el historial (evento CORREGIDO).
ALTER TABLE documento ADD COLUMN corregido_en TIMESTAMPTZ;

ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA', 'OBSERVADO', 'RECHAZADO', 'CORREGIDO'));
