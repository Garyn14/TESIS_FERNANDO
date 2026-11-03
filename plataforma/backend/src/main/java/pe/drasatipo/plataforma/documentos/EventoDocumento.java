package pe.drasatipo.plataforma.documentos;

/** Tipos de evento del historial de un documento. */
public enum EventoDocumento {
  /** Registrado y enviado a revisión por el Área encargada (HU08). */
  REGISTRADO,
  /** El Director abrió el documento, o su lote, para revisarlo (HU10, RF22). */
  REVISADO
}
