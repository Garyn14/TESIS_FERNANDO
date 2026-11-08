-- DRA-38 (HU25, RF45): cada impresión y cada descarga del PDF de un documento firmado quedan en su
-- historial. Desde la segunda impresión, como duplicado.
ALTER TABLE documento_historial DROP CONSTRAINT documento_historial_evento_check;
ALTER TABLE documento_historial ADD CONSTRAINT documento_historial_evento_check
    CHECK (evento IN ('REGISTRADO', 'REVISADO', 'PREPARADO', 'ERROR_ALMACENAMIENTO', 'FIRMADO',
                      'FIRMA_CANCELADA', 'OBSERVADO', 'RECHAZADO', 'CORREGIDO', 'ANULADO',
                      'REEMISION_SOLICITADA', 'IMPRESO', 'DESCARGADO'));
