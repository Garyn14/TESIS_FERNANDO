package pe.drasatipo.plataforma.documentos;

/** Datos para mostrar la vista previa del documento con la plantilla de su tipo (RF18). */
public record VistaPreviaRespuesta(
    String tipo,
    String tipoNombre,
    String titulo,
    String numeroExpediente,
    String nombres,
    String apellidos,
    String dni,
    String texto,
    String firmante) {

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
        firmante);
  }
}
