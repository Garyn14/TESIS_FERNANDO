package pe.drasatipo.plataforma.documentos;

/** Tipos de evento del historial de un documento. */
public enum EventoDocumento {
  /** Registrado y enviado a revisión por el Área encargada (HU08). */
  REGISTRADO,
  /** El Director abrió el documento, o su lote, para revisarlo (HU10, RF22). */
  REVISADO,
  /** Su PDF final se generó y se guardó en IPFS al iniciarse la firma (HU17, RF30). */
  PREPARADO,
  /** No se pudo guardar su PDF en IPFS: salió de la firma y volvió a Pendiente (HU17). */
  ERROR_ALMACENAMIENTO,
  /** El servidor leyó su registro en la blockchain: quedó Firmado (HU11). */
  FIRMADO,
  /**
   * La firma no se completó (cancelada en la billetera o transacción fallida): volvió a Pendiente.
   */
  FIRMA_CANCELADA,
  /** El Director lo observó; el detalle lleva el motivo (HU12). */
  OBSERVADO,
  /** El Director lo rechazó; el detalle lleva el motivo (HU12). */
  RECHAZADO,
  /** El Área encargada corrigió el documento observado y lo reenvió (HU15); lleva los cambios. */
  CORREGIDO,
  /** La anulación se leyó en la blockchain (HU29); el detalle lleva el motivo. */
  ANULADO,
  /** HU30: el Área encargada pidió reemitir el documento; lleva el código nuevo y el motivo. */
  REEMISION_SOLICITADA
}
