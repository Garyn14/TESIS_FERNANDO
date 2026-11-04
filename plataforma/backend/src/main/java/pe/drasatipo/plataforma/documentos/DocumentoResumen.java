package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Una fila de Mis documentos: un documento a solicitud de parte, o un lote completo de una emisión
 * por lista (HU09), con la cantidad de beneficiarios y cuántos hay en cada estado (HU12).
 *
 * @param estado el de un documento; en un lote, el que más atención pide (ver {@link #PRIORIDAD})
 * @param estados cuántos documentos hay en cada estado, en el orden de {@link #PRIORIDAD}
 */
public record DocumentoResumen(
    String codigo,
    String lote,
    String tipoNombre,
    String beneficiario,
    String numeroExpediente,
    OffsetDateTime registradoEn,
    EstadoDocumento estado,
    long cantidad,
    Map<EstadoDocumento, Long> estados) {

  /** Orden en que se muestran los estados de un lote: primero lo que sigue en trámite. */
  static final List<EstadoDocumento> PRIORIDAD =
      List.of(
          EstadoDocumento.PENDIENTE,
          EstadoDocumento.PROCESANDO_FIRMA,
          EstadoDocumento.OBSERVADO,
          EstadoDocumento.FIRMADO,
          EstadoDocumento.RECHAZADO);

  static DocumentoResumen de(Documento documento) {
    return new DocumentoResumen(
        documento.getCodigo(),
        null,
        documento.getTipo().getNombre(),
        documento.getBeneficiario(),
        documento.getNumeroExpediente(),
        documento.getRegistradoEn(),
        documento.getEstado(),
        1,
        Map.of(documento.getEstado(), 1L));
  }

  /** El lote, en una sola fila, a partir de todos sus documentos. */
  static DocumentoResumen deLote(List<Documento> delLote) {
    Documento documento = delLote.getFirst();
    Lote lote = documento.getLote();
    Map<EstadoDocumento, Long> conteo = new EnumMap<>(EstadoDocumento.class);
    delLote.forEach(d -> conteo.merge(d.getEstado(), 1L, Long::sum));
    Map<EstadoDocumento, Long> estados = new java.util.LinkedHashMap<>();
    PRIORIDAD.stream().filter(conteo::containsKey).forEach(e -> estados.put(e, conteo.get(e)));
    long cantidad = delLote.size();
    return new DocumentoResumen(
        null,
        lote.getNumero(),
        documento.getTipo().getNombre(),
        cantidad == 1 ? "1 beneficiario" : cantidad + " beneficiarios",
        null,
        lote.getRegistradoEn(),
        estados.keySet().iterator().next(),
        cantidad,
        estados);
  }
}
