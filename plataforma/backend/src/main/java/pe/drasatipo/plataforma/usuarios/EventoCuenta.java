package pe.drasatipo.plataforma.usuarios;

/** Tipos de evento del historial de una cuenta (HU02). */
public enum EventoCuenta {
  CREADA,
  EDITADA,
  DESACTIVADA,
  REACTIVADA,
  /** Tres intentos fallidos seguidos de inicio de sesión (HU03). */
  BLOQUEADA,
  /** La persona cambió su propia contraseña (HU04). */
  CONTRASENA_CAMBIADA,
  /** El Administrador asignó una contraseña temporal (HU04). */
  CONTRASENA_RESTABLECIDA,
  /** Billetera del director registrada o cambiada (HU06). */
  BILLETERA_REGISTRADA,
  /** Rol de firmante otorgado en el contrato (HU06). */
  FIRMANTE_OTORGADO,
  /** Rol de firmante revocado en el contrato (HU06). */
  FIRMANTE_REVOCADO
}
