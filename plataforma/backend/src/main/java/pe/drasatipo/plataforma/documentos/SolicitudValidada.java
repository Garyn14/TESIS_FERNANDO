package pe.drasatipo.plataforma.documentos;

import java.util.Map;
import pe.drasatipo.plataforma.areas.TipoDocumento;

/** Una solicitud ya normalizada y validada, con el texto armado con la plantilla de su tipo. */
record SolicitudValidada(
    TipoDocumento tipo,
    String numeroExpediente,
    String nombres,
    String apellidos,
    String dni,
    Map<String, String> datos,
    String texto) {

  String beneficiario() {
    return nombres + " " + apellidos;
  }
}
