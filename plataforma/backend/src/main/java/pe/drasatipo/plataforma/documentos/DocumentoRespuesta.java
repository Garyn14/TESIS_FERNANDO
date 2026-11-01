package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;

/** Detalle de un documento. Nunca incluye el HMAC del DNI ni el token del QR. */
public record DocumentoRespuesta(
    String codigo,
    String tipo,
    String tipoNombre,
    String titulo,
    String origen,
    EstadoDocumento estado,
    String numeroExpediente,
    String nombres,
    String apellidos,
    String dni,
    String texto,
    String areaNombre,
    String registradoPor,
    OffsetDateTime registradoEn,
    String firmante) {

  static DocumentoRespuesta de(Documento documento, String firmante) {
    return new DocumentoRespuesta(
        documento.getCodigo(),
        documento.getTipo().getCodigo(),
        documento.getTipo().getNombre(),
        documento.getTipo().getTitulo(),
        documento.getOrigen(),
        documento.getEstado(),
        documento.getNumeroExpediente(),
        documento.getNombres(),
        documento.getApellidos(),
        documento.getDni(),
        documento.getTexto(),
        documento.getArea().getNombre(),
        documento.getRegistradoPor().getNombreCompleto(),
        documento.getRegistradoEn(),
        firmante);
  }
}
