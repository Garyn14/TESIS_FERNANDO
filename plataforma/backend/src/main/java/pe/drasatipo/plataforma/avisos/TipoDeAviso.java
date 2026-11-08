package pe.drasatipo.plataforma.avisos;

/** Por qué se avisa (RF46–RF48). */
public enum TipoDeAviso {
  /** HU26: un documento o un lote quedó pendiente de la revisión del Director. */
  PENDIENTE_REVISION,
  /** HU27: un documento o certificados de un lote quedaron firmados. */
  FIRMADO,
  /** HU27: el Director observó un documento o certificados de un lote. */
  OBSERVADO,
  /** HU27: el Director rechazó un documento o certificados de un lote. */
  RECHAZADO,
  /** HU27: un documento quedó anulado en la blockchain. */
  ANULADO
}
