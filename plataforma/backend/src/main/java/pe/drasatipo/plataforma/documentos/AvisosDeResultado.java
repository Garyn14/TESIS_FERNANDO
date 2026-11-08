package pe.drasatipo.plataforma.documentos;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.drasatipo.plataforma.avisos.Avisos;
import pe.drasatipo.plataforma.avisos.TipoDeAviso;

/**
 * HU27 (RF47): avisos al Área encargada del resultado de lo que envió: firmado, observado,
 * rechazado o anulado. HU28 (RF48): avisos a Mesa de Partes de lo que está listo para entregar y de
 * lo rechazado. Un lote genera un solo aviso por firma o por decisión.
 */
@Component
class AvisosDeResultado {

  private final Avisos avisos;
  private final JdbcTemplate jdbc;

  AvisosDeResultado(Avisos avisos, JdbcTemplate jdbc) {
    this.avisos = avisos;
    this.jdbc = jdbc;
  }

  private static String documento(Documento d) {
    return "%s – %s".formatted(d.getTipo().getNombre(), d.getBeneficiario());
  }

  private static String lote(Lote lote) {
    return "Lote %s – %s"
        .formatted(
            lote.getNumero(),
            lote.getDatos().getOrDefault("nombreEvento", lote.getTipo().getNombre()));
  }

  private static String certificados(long n, String participio) {
    return n == 1 ? "1 certificado " + participio : "%d certificados %ss".formatted(n, participio);
  }

  /** HU28: el documento con su expediente, para Mesa de Partes. */
  private static String conExpediente(Documento d) {
    return d.getNumeroExpediente() == null
        ? documento(d)
        : "%s (expediente %s)".formatted(documento(d), d.getNumeroExpediente());
  }

  /** HU28: Mesa de Partes abre la ficha del documento, o busca el lote con un filtro. */
  private static String enlaceDeConsulta(Documento d, String estado) {
    return d.getLote() == null
        ? "buscar/" + d.getCodigo()
        : "buscar?texto=%s%s"
            .formatted(d.getLote().getNumero(), estado == null ? "" : "&estado=" + estado);
  }

  private static String enlace(Documento d) {
    return d.getLote() == null
        ? "mis-documentos/" + d.getCodigo()
        : "mis-documentos/lote/" + d.getLote().getNumero();
  }

  /**
   * Un documento quedó Firmado con la transacción. En un lote, el aviso de esa transacción cuenta
   * todos sus certificados firmados en ella; si ya existía, se actualiza.
   */
  void firmado(Documento d, String transaccion) {
    short area = d.getArea().getId();
    if (d.getLote() == null) {
      avisos.aArea(
          area,
          TipoDeAviso.FIRMADO,
          "Firmado: " + documento(d),
          enlace(d),
          "firmado:" + d.getCodigo());
      avisos.aConsultaInterna(
          TipoDeAviso.LISTO_PARA_ENTREGAR,
          "Listo para entregar: " + conExpediente(d),
          enlaceDeConsulta(d, null),
          "entregar:" + d.getCodigo());
      return;
    }
    Long firmados =
        jdbc.queryForObject(
            "SELECT count(*) FROM documento WHERE lote_id = ? AND estado = 'FIRMADO'"
                + " AND lower(transaccion) = lower(?)",
            Long.class,
            d.getLote().getId(),
            transaccion);
    avisos.aArea(
        area,
        TipoDeAviso.FIRMADO,
        "%s: %s"
            .formatted(lote(d.getLote()), certificados(firmados == null ? 1 : firmados, "firmado")),
        enlace(d),
        "firmado:%s:%s".formatted(transaccion.toLowerCase(), d.getLote().getNumero()));
    avisos.aConsultaInterna(
        TipoDeAviso.LISTO_PARA_ENTREGAR,
        "Listo para entregar: %s: %s"
            .formatted(lote(d.getLote()), certificados(firmados == null ? 1 : firmados, "firmado")),
        enlaceDeConsulta(d, null),
        "entregar:%s:%s".formatted(transaccion.toLowerCase(), d.getLote().getNumero()));
  }

  /** El Director observó o rechazó estos documentos con un motivo: uno por documento o por lote. */
  void decision(List<Documento> decididos, EstadoDocumento decision, String motivo) {
    boolean observar = decision == EstadoDocumento.OBSERVADO;
    TipoDeAviso tipo = observar ? TipoDeAviso.OBSERVADO : TipoDeAviso.RECHAZADO;
    String palabra = observar ? "observado" : "rechazado";
    Map<String, List<Documento>> porLote = new LinkedHashMap<>();
    for (Documento d : decididos) {
      if (d.getLote() == null) {
        avisos.aArea(
            d.getArea().getId(),
            tipo,
            "%s: %s. Motivo: %s"
                .formatted(observar ? "Observado" : "Rechazado", documento(d), motivo),
            enlace(d),
            null);
        if (!observar) {
          avisos.aConsultaInterna(
              tipo,
              "Rechazado: %s. Motivo: %s".formatted(conExpediente(d), motivo),
              enlaceDeConsulta(d, null),
              null);
        }
      } else {
        porLote.computeIfAbsent(d.getLote().getNumero(), k -> new java.util.ArrayList<>()).add(d);
      }
    }
    porLote
        .values()
        .forEach(delLote -> {
          Documento d = delLote.getFirst();
          avisos.aArea(
              d.getArea().getId(),
              tipo,
              "%s: %s. Motivo: %s"
                  .formatted(lote(d.getLote()), certificados(delLote.size(), palabra), motivo),
              enlace(d),
              null);
          if (!observar) {
            avisos.aConsultaInterna(
                tipo,
                "Rechazado: %s: %s. Motivo: %s"
                    .formatted(lote(d.getLote()), certificados(delLote.size(), palabra), motivo),
                enlaceDeConsulta(d, "RECHAZADOS"),
                null);
          }
        });
  }

  /** Un documento quedó Anulado en la blockchain, con su motivo. */
  void anulado(Documento d, String motivo) {
    avisos.aArea(
        d.getArea().getId(),
        TipoDeAviso.ANULADO,
        "Anulado: %s. Motivo: %s".formatted(documento(d), motivo),
        enlace(d),
        "anulado:" + d.getCodigo());
  }
}
