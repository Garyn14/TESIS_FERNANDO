package pe.drasatipo.plataforma.documentos;

/**
 * Datos para mostrar la vista previa del documento con la plantilla de su tipo (RF18). {@code
 * vigenciaMeses}: DRA-62, null si el tipo no vence.
 */
public record VistaPreviaRespuesta(
    String tipo,
    String tipoNombre,
    String titulo,
    String numeroExpediente,
    String nombres,
    String apellidos,
    String dni,
    String texto,
    String firmante,
    Short vigenciaMeses) {

  static VistaPreviaRespuesta de(SolicitudValidada solicitud, String firmante) {
    return new VistaPreviaRespuesta(
        solicitud.tipo().getCodigo(),
        solicitud.tipo().getNombre(),
        solicitud.tipo().getTitulo(),
        solicitud.numeroExpediente(),
        solicitud.nombres(),
        solicitud.apellidos(),
        solicitud.dni(),
        solicitud.texto(),
        firmante,
        solicitud.tipo().getVigenciaMeses());
  }
}
