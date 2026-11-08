package pe.drasatipo.plataforma.consulta;

import java.time.OffsetDateTime;
import java.util.List;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;

/**
 * Una fila de Buscar documentos (HU22): un documento, o un lote con los certificados que coinciden
 * con la búsqueda.
 *
 * @param lote el número del lote; en un documento a solicitud de parte, {@code null}
 * @param cantidad en un lote, cuántos certificados tiene en total
 * @param completo en un lote, si se muestran todos sus certificados
 * @param certificados en un lote, los certificados que coinciden, en el orden de la lista
 */
public record FilaDeBusqueda(
    String codigo,
    String lote,
    String tipoNombre,
    String beneficiario,
    String dni,
    String numeroExpediente,
    String areaNombre,
    OffsetDateTime registradoEn,
    EstadoDocumento estado,
    Integer cantidad,
    Boolean completo,
    List<FilaDeBusqueda> certificados) {

  static FilaDeBusqueda documento(
      String codigo,
      String lote,
      String tipoNombre,
      String beneficiario,
      String dni,
      String numeroExpediente,
      String areaNombre,
      OffsetDateTime registradoEn,
      EstadoDocumento estado) {
    return new FilaDeBusqueda(
        codigo,
        lote,
        tipoNombre,
        beneficiario,
        dni,
        numeroExpediente,
        areaNombre,
        registradoEn,
        estado,
        null,
        null,
        null);
  }

  static FilaDeBusqueda lote(
      String numero,
      String tipoNombre,
      String areaNombre,
      OffsetDateTime registradoEn,
      int cantidad,
      List<FilaDeBusqueda> certificados) {
    return new FilaDeBusqueda(
        null,
        numero,
        tipoNombre,
        null,
        null,
        null,
        areaNombre,
        registradoEn,
        null,
        cantidad,
        certificados.size() == cantidad,
        certificados);
  }
}
