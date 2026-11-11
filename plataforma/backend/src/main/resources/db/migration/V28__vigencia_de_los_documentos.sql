-- DRA-62: vigencia opcional por tipo de documento (opción A). La fecha de vencimiento se imprime en
-- el PDF final, cuya huella ya está en la blockchain: el contrato no cambia. Por defecto ningún tipo
-- vence (vigencia_meses nulo), así que todo sigue igual hasta que el Administrador lo configure.
ALTER TABLE tipo_documento
    ADD COLUMN vigencia_meses SMALLINT CHECK (vigencia_meses BETWEEN 1 AND 120);

-- Se fija junto con la fecha de emisión al preparar la firma, y se borra con ella si la preparación
-- falla. "Vencido" no es un estado: se calcula con esta fecha.
ALTER TABLE documento ADD COLUMN vence_en DATE;
ALTER TABLE documento ADD CONSTRAINT documento_vence_con_emision_check
    CHECK (vence_en IS NULL OR (fecha_emision IS NOT NULL AND vence_en > fecha_emision));

-- Un cambio de vigencia es de un tipo de documento, no de un área.
ALTER TABLE catalogo_historial ALTER COLUMN area_id DROP NOT NULL;
