-- DRA-18 (HU07, RF10): descripción breve de cada tipo de documento, para la pantalla "Nuevo documento".
-- PENDIENTE: validar los textos con el Product Owner, junto con los nombres de las áreas (HU05).
ALTER TABLE tipo_documento ADD COLUMN descripcion VARCHAR(200);

UPDATE tipo_documento SET descripcion = CASE codigo
    WHEN 'CONSTANCIA_PRODUCTOR_ACTIVO' THEN 'Para productores agrarios que la solicitan en Mesa de Partes.'
    WHEN 'CERTIFICADO_PRACTICAS'       THEN 'Para estudiantes que culminaron sus prácticas en la agencia.'
    WHEN 'CERTIFICADO_TRABAJO'         THEN 'Para personas que trabajaron en la agencia.'
    WHEN 'CERTIFICADO_RECONOCIMIENTO'  THEN 'Para reconocimientos institucionales.'
    WHEN 'CERTIFICADO_CAPACITACION'    THEN 'Para participantes de talleres y capacitaciones.'
END;

ALTER TABLE tipo_documento ALTER COLUMN descripcion SET NOT NULL;
