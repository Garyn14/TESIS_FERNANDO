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
  ERROR_ALMACENAMIENTO
}
