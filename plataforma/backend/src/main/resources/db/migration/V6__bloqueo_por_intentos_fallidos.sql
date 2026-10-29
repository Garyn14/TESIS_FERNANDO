-- DRA-14 (HU03, RNF02): tras tres intentos fallidos consecutivos, la cuenta se bloquea una hora.
-- intentos_fallidos cuenta los fallos seguidos y vuelve a cero con un ingreso correcto o al
-- bloquear. bloqueada_hasta es nulo si la cuenta no está bloqueada.
ALTER TABLE usuario
    ADD COLUMN intentos_fallidos SMALLINT    NOT NULL DEFAULT 0,
    ADD COLUMN bloqueada_hasta   TIMESTAMPTZ;

-- El bloqueo queda en el historial de la cuenta. realizado_por es nulo: lo hace el sistema.
ALTER TABLE usuario_historial DROP CONSTRAINT usuario_historial_evento_check;
ALTER TABLE usuario_historial ADD CONSTRAINT usuario_historial_evento_check
    CHECK (evento IN ('CREADA', 'EDITADA', 'DESACTIVADA', 'REACTIVADA', 'BLOQUEADA'));
