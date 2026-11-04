package pe.drasatipo.plataforma.documentos;

import java.util.Map;

/**
 * HU30: los datos corregidos de una reemisión y su motivo. El tipo, el área, el lote y el número de
 * expediente son los del original. En un certificado de lote solo cuentan los nombres, los
 * apellidos y el DNI.
 */
public record SolicitudReemision(
    String nombres, String apellidos, String dni, Map<String, String> datos, String motivo) {

  SolicitudDocumento comoSolicitud() {
    return new SolicitudDocumento(null, null, nombres, apellidos, dni, datos);
  }
}
