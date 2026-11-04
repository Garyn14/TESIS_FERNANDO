package pe.drasatipo.plataforma.documentos;

/** Estados de un documento. Los de revisión y firma se agregan en los Sprints 3 y 4. */
public enum EstadoDocumento {
  /** Enviado a revisión: no se puede modificar (RF20). */
  PENDIENTE,
  /**
   * El Director inició la firma: su PDF final se genera y se guarda en IPFS (HU17), y queda así
   * hasta que la firma se registra en la blockchain (HU11). HU18 corrige los que se detienen.
   */
  PROCESANDO_FIRMA,
  /** Registrado en la blockchain con la billetera del Director (HU11, RF31). */
  FIRMADO,
  /**
   * El Director lo observó con un motivo: vuelve al Área encargada para corregirlo (HU12, HU15).
   */
  OBSERVADO,
  /** El Director lo rechazó con un motivo. Es definitivo (HU12, HU14). */
  RECHAZADO
}
