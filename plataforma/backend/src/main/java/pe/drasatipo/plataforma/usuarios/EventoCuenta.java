package pe.drasatipo.plataforma.usuarios;

/** Tipos de evento del historial de una cuenta (HU02). */
public enum EventoCuenta {
  CREADA,
  EDITADA,
  DESACTIVADA,
  REACTIVADA,
  /** Tres intentos fallidos seguidos de inicio de sesión (HU03). */
  BLOQUEADA
}
