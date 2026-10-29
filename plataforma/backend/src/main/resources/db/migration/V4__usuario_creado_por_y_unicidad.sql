-- DRA-12 (HU01, RF01): datos para la creación de cuentas por el Administrador.
-- creado_por guarda quién creó la cuenta, como base del historial de auditoría (RF01). Es nulo
-- solo para la primera cuenta de Administrador, que la crea el inicializador (RF09).
ALTER TABLE usuario ADD COLUMN creado_por BIGINT REFERENCES usuario (id);

-- El nombre de usuario no se repite aunque cambien las mayúsculas (jperez y JPerez).
CREATE UNIQUE INDEX usuario_nombre_usuario_minusculas_uk ON usuario (lower(nombre_usuario));
