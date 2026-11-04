package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;

/**
 * Una fila de la bandeja "Por revisar" (HU10): un documento, o un lote completo con el nombre del
 * evento y la cantidad de certificados (RF21). {@code corregido}: reenviado tras una observación
 * (HU15).
 */
public record ElementoPorRevisar(
    String codigo,
    String lote,
    String tipoNombre,
    String beneficiario,
    String evento,
    long cantidad,
    String numeroExpediente,
    String areaNombre,
    String enviadoPor,
    OffsetDateTime registradoEn,
    boolean revisado,
    boolean corregido) {

  static ElementoPorRevisar de(Documento documento) {
    return new ElementoPorRevisar(
        documento.getCodigo(),
        null,
        documento.getTipo().getNombre(),
        documento.getBeneficiario(),
        null,
        1,
        documento.getNumeroExpediente(),
        documento.getArea().getNombre(),
        documento.getRegistradoPor().getNombreCompleto(),
        documento.getRegistradoEn(),
        documento.isRevisado(),
        documento.isCorregido());
  }

  /** El lote en una sola fila; está revisado cuando lo están todos sus documentos pendientes. */
  static ElementoPorRevisar deLote(
      Documento primero, long cantidad, boolean revisado, boolean corregido) {
    Lote lote = primero.getLote();
    return new ElementoPorRevisar(
        null,
        lote.getNumero(),
        lote.getTipo().getNombre(),
        null,
        lote.getDatos().get("nombreEvento"),
        cantidad,
        null,
        lote.getArea().getNombre(),
        lote.getRegistradoPor().getNombreCompleto(),
        lote.getRegistradoEn(),
        revisado,
        corregido);
  }
}
