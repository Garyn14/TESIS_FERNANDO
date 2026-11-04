-- DRA-26 (HU18, RF32–RF35, RNF10): una tarea del servidor lee los eventos DocumentoRegistrado del
-- contrato y corrige los documentos detenidos en Procesando firma. Se guarda el último bloque
-- procesado, por contrato, para continuar desde ahí después de un reinicio.
CREATE TABLE sincronizacion_blockchain (
    id             SMALLINT    PRIMARY KEY CHECK (id = 1),
    contrato       VARCHAR(42) NOT NULL,
    ultimo_bloque  BIGINT      NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuándo pasó el documento a Procesando firma: con esto se sabe si quedó detenido.
ALTER TABLE documento ADD COLUMN firma_iniciada_en TIMESTAMPTZ;
UPDATE documento SET firma_iniciada_en = coalesce(preparado_en, now()) WHERE estado = 'PROCESANDO_FIRMA';

-- Lo que hace la sincronización queda a nombre de la cuenta dueña de la billetera que firmó; si no
-- hay una, queda sin cuenta: lo hizo el sistema.
ALTER TABLE documento_historial ALTER COLUMN realizado_por DROP NOT NULL;
