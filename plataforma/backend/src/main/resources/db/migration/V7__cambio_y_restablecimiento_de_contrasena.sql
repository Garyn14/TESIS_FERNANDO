-- DRA-15 (HU04, RF03): cambio y restablecimiento de contraseña.
-- contrasena_cambiada_en: momento del último cambio o restablecimiento. Las sesiones iniciadas
-- antes de ese momento se cierran en su siguiente solicitud (otras sesiones de la misma cuenta).
ALTER TABLE usuario ADD COLUMN contrasena_cambiada_en TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE usuario SET contrasena_cambiada_en = creado_en;

-- Ambos quedan en el historial, sin guardar ninguna contraseña. CONTRASENA_RESTABLECIDA tiene 23
-- caracteres, por eso la columna pasa de 20 a 30.
ALTER TABLE usuario_historial ALTER COLUMN evento TYPE VARCHAR(30);
ALTER TABLE usuario_historial DROP CONSTRAINT usuario_historial_evento_check;
ALTER TABLE usuario_historial ADD CONSTRAINT usuario_historial_evento_check
    CHECK (evento IN ('CREADA', 'EDITADA', 'DESACTIVADA', 'REACTIVADA', 'BLOQUEADA',
                      'CONTRASENA_CAMBIADA', 'CONTRASENA_RESTABLECIDA'));
