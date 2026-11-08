package pe.drasatipo.plataforma.consulta;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.blockchain.RedBlockchainProperties;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.documentos.EventoDocumento;

/**
 * Historial y detalle técnico de auditoría de un documento (HU24, RF44). Solo lee: el historial
 * nunca se modifica ni se elimina.
 */
@Service
public class AuditoriaDeDocumentos {

  private final NamedParameterJdbcTemplate jdbc;
  private final RedBlockchainProperties red;

  public AuditoriaDeDocumentos(NamedParameterJdbcTemplate jdbc, RedBlockchainProperties red) {
    this.jdbc = jdbc;
    this.red = red;
  }

  @Transactional(readOnly = true)
  public AuditoriaDelDocumento auditoria(String codigo) {
    Map<String, Object> codigoParam = Map.of("codigo", codigo);
    List<AuditoriaDelDocumento.Tecnico> tecnico =
        jdbc.query(
            """
            SELECT hash_pdf, cid, transaccion, bloque, billetera_firmante, firmado_en,
                   transaccion_anulacion, bloque_anulacion, anulado_en
            FROM documento WHERE codigo = :codigo
            """,
            codigoParam,
            (fila, n) ->
                new AuditoriaDelDocumento.Tecnico(
                    fila.getString("hash_pdf"),
                    fila.getString("cid"),
                    fila.getString("transaccion"),
                    fila.getObject("bloque", Long.class),
                    fila.getString("billetera_firmante"),
                    fila.getObject("firmado_en", OffsetDateTime.class),
                    fila.getString("transaccion_anulacion"),
                    fila.getObject("bloque_anulacion", Long.class),
                    fila.getObject("anulado_en", OffsetDateTime.class),
                    fila.getString("transaccion") == null ? null : contrato()));
    if (tecnico.isEmpty()) {
      throw new ReglaDeNegocioException(
          HttpStatus.NOT_FOUND, null, FichaDeDocumentos.NO_ENCONTRADO.formatted(codigo));
    }
    // El sistema (la sincronización con la blockchain) no tiene cuenta: LEFT JOIN.
    List<AuditoriaDelDocumento.Evento> eventos =
        jdbc.query(
            """
            SELECT h.evento, h.realizado_en, u.nombre_completo, r.nombre AS rol, h.detalle
            FROM documento_historial h
            JOIN documento d ON d.id = h.documento_id
            LEFT JOIN usuario u ON u.id = h.realizado_por
            LEFT JOIN rol r ON r.id = u.rol_id
            WHERE d.codigo = :codigo
            ORDER BY h.realizado_en, h.id
            """,
            codigoParam,
            (fila, n) ->
                new AuditoriaDelDocumento.Evento(
                    EventoDocumento.valueOf(fila.getString("evento")),
                    fila.getObject("realizado_en", OffsetDateTime.class),
                    fila.getString("nombre_completo"),
                    fila.getString("rol"),
                    fila.getString("detalle")));
    return new AuditoriaDelDocumento(eventos, tecnico.getFirst());
  }

  private String contrato() {
    return red.contratoConfigurado() ? red.contrato() : null;
  }
}
