-- DRA-13 (HU02, RF01): historial de cada cuenta. RF01 exige que desactivar una cuenta no elimine
-- la cuenta ni su historial, por eso las cuentas nunca se borran y cada cambio queda registrado
-- con quién lo hizo y cuándo.
CREATE TABLE usuario_historial (
    id            BIGSERIAL    PRIMARY KEY,
    usuario_id    BIGINT       NOT NULL REFERENCES usuario (id),
    evento        VARCHAR(20)  NOT NULL
                  CHECK (evento IN ('CREADA', 'EDITADA', 'DESACTIVADA', 'REACTIVADA')),
    -- Qué cambió, en lenguaje cotidiano. Ej.: "Rol: Director → Consulta interna".
    detalle       VARCHAR(500),
    -- Nulo solo para la primera cuenta de Administrador, que la crea el inicializador (RF09).
    realizado_por BIGINT       REFERENCES usuario (id),
    realizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX usuario_historial_usuario_idx ON usuario_historial (usuario_id, realizado_en);

-- Las cuentas creadas antes de esta migración reciben su evento de creación.
INSERT INTO usuario_historial (usuario_id, evento, detalle, realizado_por, realizado_en)
SELECT u.id, 'CREADA', 'Rol: ' || r.nombre, u.creado_por, u.creado_en
FROM usuario u JOIN rol r ON r.id = u.rol_id;
