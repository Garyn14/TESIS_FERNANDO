package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;

/** Una fila de Mis documentos. */
public record DocumentoResumen(
    String codigo,
    String tipoNombre,
    String beneficiario,
    String numeroExpediente,
    OffsetDateTime registradoEn,
    EstadoDocumento estado) {

  static DocumentoResumen de(Documento documento) {
    return new DocumentoResumen(
        documento.getCodigo(),
        documento.getTipo().getNombre(),
        documento.getBeneficiario(),
        documento.getNumeroExpediente(),
        documento.getRegistradoEn(),
        documento.getEstado());
  }
}
