package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Detalle de un lote (HU09): los datos del evento, el ejemplo y sus documentos. */
public record LoteRespuesta(
    String numero,
    String tipo,
    String tipoNombre,
    String areaNombre,
    String registradoPor,
    OffsetDateTime registradoEn,
    Map<String, String> datos,
    String periodo,
    VistaPreviaRespuesta ejemplo,
    List<DocumentoDelLote> documentos) {

  /** Un certificado del lote, con su estado y el motivo si fue observado o rechazado (HU12). */
  public record DocumentoDelLote(
      String codigo,
      String nombres,
      String apellidos,
      String dni,
      EstadoDocumento estado,
      String motivo) {}
}
