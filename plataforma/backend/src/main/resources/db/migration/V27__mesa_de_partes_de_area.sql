-- DRA-58: el rol "Mesa de Partes de área" busca, consulta y entrega solo los documentos de su área.
-- Tiene los permisos de Mesa de Partes menos los avisos (NOTIFICACIONES_VER).
--
-- Qué roles tienen un área obligatoria y quedan limitados a ella (RF05) deja de depender del código
-- AREA_ENCARGADA: lo decide la columna rol.limitado_al_area, que leen AlcanceDeArea, GestionUsuarios
-- y el formulario de cuentas.
ALTER TABLE rol ADD COLUMN limitado_al_area BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE rol SET limitado_al_area = TRUE WHERE codigo = 'AREA_ENCARGADA';

INSERT INTO rol (codigo, nombre, descripcion, limitado_al_area) VALUES
    ('MESA_PARTES_AREA', 'Mesa de Partes de área',
     'Busca, consulta el historial, imprime y entrega los documentos de su área', TRUE);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r JOIN permiso p
  ON p.codigo IN ('CUENTA_PROPIA', 'DOCUMENTO_BUSCAR', 'AUDITORIA_VER', 'DOCUMENTO_IMPRIMIR')
WHERE r.codigo = 'MESA_PARTES_AREA';
