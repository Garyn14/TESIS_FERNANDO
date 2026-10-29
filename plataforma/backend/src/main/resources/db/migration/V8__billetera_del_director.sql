-- DRA-17 (HU06, RF07, RF08): billetera del director y cambios de su rol de firmante.
-- La dirección se guarda con la suma de verificación EIP-55; la unicidad no distingue mayúsculas
-- porque 0xAbC... y 0xabc... son la misma billetera. Nunca se guarda una clave privada (RNF05).
ALTER TABLE usuario ADD COLUMN billetera VARCHAR(42);
CREATE UNIQUE INDEX usuario_billetera_minusculas_uk ON usuario (lower(billetera));

-- El historial registra la billetera y cada otorgamiento o revocación con su transacción.
ALTER TABLE usuario_historial DROP CONSTRAINT usuario_historial_evento_check;
ALTER TABLE usuario_historial ADD CONSTRAINT usuario_historial_evento_check
    CHECK (evento IN ('CREADA', 'EDITADA', 'DESACTIVADA', 'REACTIVADA', 'BLOQUEADA',
                      'CONTRASENA_CAMBIADA', 'CONTRASENA_RESTABLECIDA',
                      'BILLETERA_REGISTRADA', 'FIRMANTE_OTORGADO', 'FIRMANTE_REVOCADO'));
