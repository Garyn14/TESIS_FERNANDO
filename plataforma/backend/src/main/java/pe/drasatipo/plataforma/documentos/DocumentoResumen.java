package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;

/**
 * Una fila de Mis documentos: un documento a solicitud de parte, o un lote completo de una emisión
 * por lista (HU09), con la cantidad de beneficiarios.
 */
public record DocumentoResumen(
    String codigo,
    String lote,
    String tipoNombre,
    String beneficiario,
    String numeroExpediente,
    OffsetDateTime registradoEn,
    EstadoDocumento estado,
    long cantidad) {

  static DocumentoResumen de(Documento documento) {
    return new DocumentoResumen(
        documento.getCodigo(),
        null,
        documento.getTipo().getNombre(),
        documento.getBeneficiario(),
        documento.getNumeroExpediente(),
        documento.getRegistradoEn(),
        documento.getEstado(),
        1);
  }

  /** El lote del documento, en una sola fila. Hoy todos sus documentos están Pendientes. */
  static DocumentoResumen deLote(Documento documento, long cantidad) {
    Lote lote = documento.getLote();
    return new DocumentoResumen(
        null,
        lote.getNumero(),
        documento.getTipo().getNombre(),
        cantidad == 1 ? "1 beneficiario" : cantidad + " beneficiarios",
        null,
        lote.getRegistradoEn(),
        documento.getEstado(),
        cantidad);
  }
}
