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
 * rechazado o anulado. Un lote genera un solo aviso por firma o por decisión.
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
      } else {
        porLote.computeIfAbsent(d.getLote().getNumero(), k -> new java.util.ArrayList<>()).add(d);
      }
    }
    porLote
        .values()
        .forEach(
            delLote -> {
              Documento d = delLote.getFirst();
              avisos.aArea(
                  d.getArea().getId(),
                  tipo,
                  "%s: %s. Motivo: %s"
                      .formatted(lote(d.getLote()), certificados(delLote.size(), palabra), motivo),
                  enlace(d),
                  null);
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
