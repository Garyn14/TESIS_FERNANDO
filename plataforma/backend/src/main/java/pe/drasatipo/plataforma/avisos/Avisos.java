package pe.drasatipo.plataforma.avisos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;

/**
 * Avisos dentro de la plataforma (HU26–HU28, RF46–RF48). Cada aviso es de una persona. Se crean en
 * la transacción del hecho que los origina: si el hecho no se guarda, tampoco el aviso.
 */
@Service
public class Avisos {

  /** Avisos que se muestran en el panel. */
  static final int MAXIMO = 30;

  static final String NO_ENCONTRADO = "No se encontró el aviso.";

  private final NamedParameterJdbcTemplate jdbc;

  public Avisos(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** HU26 (RF46): un aviso para cada director activo. */
  @Transactional
  public void aDirectores(TipoDeAviso tipo, String texto, String enlace) {
    jdbc.update(
        """
        INSERT INTO aviso (destinatario_id, tipo, texto, enlace)
        SELECT u.id, :tipo, :texto, :enlace FROM usuario u JOIN rol r ON r.id = u.rol_id
        WHERE r.codigo = 'DIRECTOR' AND u.activo
        """,
        parametros(tipo, texto, enlace));
  }

  /**
   * HU27 (RF47): un aviso para cada persona activa del área con el rol Área encargada. Con una
   * clave, si la persona ya tiene un aviso con esa clave, se actualiza y vuelve a quedar sin leer.
   */
  @Transactional
  public void aArea(short areaId, TipoDeAviso tipo, String texto, String enlace, String clave) {
    jdbc.update(
        """
        INSERT INTO aviso (destinatario_id, tipo, texto, enlace, clave)
        SELECT u.id, :tipo, :texto, :enlace, :clave FROM usuario u JOIN rol r ON r.id = u.rol_id
        WHERE r.codigo = 'AREA_ENCARGADA' AND u.activo AND u.area_id = :area
        ON CONFLICT (destinatario_id, clave) WHERE clave IS NOT NULL
        DO UPDATE SET texto = EXCLUDED.texto, enlace = EXCLUDED.enlace, creado_en = now(),
                      leido_en = NULL
        """,
        parametros(tipo, texto, enlace).addValue("area", areaId).addValue("clave", clave));
  }

  private static MapSqlParameterSource parametros(TipoDeAviso tipo, String texto, String enlace) {
    return new MapSqlParameterSource()
        .addValue("tipo", tipo.name())
        .addValue("texto", texto.length() > 300 ? texto.substring(0, 299) + "…" : texto)
        .addValue("enlace", enlace);
  }

  /** Los 30 avisos más recientes de la persona y cuántos tiene sin leer. */
  @Transactional(readOnly = true)
  public AvisosRespuesta de(String nombreUsuario) {
    Map<String, Object> usuario = Map.of("usuario", nombreUsuario);
    List<AvisoRespuesta> avisos =
        jdbc.query(
            """
            SELECT a.id, a.tipo, a.texto, a.enlace, a.creado_en, a.leido_en IS NOT NULL AS leido
            FROM aviso a JOIN usuario u ON u.id = a.destinatario_id
            WHERE lower(u.nombre_usuario) = lower(:usuario)
            ORDER BY a.creado_en DESC, a.id DESC
            LIMIT %d
            """
                .formatted(MAXIMO),
            usuario,
            (fila, n) ->
                new AvisoRespuesta(
                    fila.getLong("id"),
                    TipoDeAviso.valueOf(fila.getString("tipo")),
                    fila.getString("texto"),
                    fila.getString("enlace"),
                    fila.getObject("creado_en", OffsetDateTime.class),
                    fila.getBoolean("leido")));
    Long sinLeer =
        jdbc.queryForObject(
            """
            SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id
            WHERE lower(u.nombre_usuario) = lower(:usuario) AND a.leido_en IS NULL
            """,
            usuario,
            Long.class);
    return new AvisosRespuesta(avisos, sinLeer == null ? 0 : sinLeer);
  }

  /** Marca un aviso de la persona como leído. Uno de otra persona responde como inexistente. */
  @Transactional
  public void marcarLeido(String nombreUsuario, long id) {
    int propios =
        jdbc.update(
            """
            UPDATE aviso a SET leido_en = COALESCE(a.leido_en, now())
            FROM usuario u
            WHERE a.id = :id AND u.id = a.destinatario_id AND lower(u.nombre_usuario) = lower(:usuario)
            """,
            Map.of("id", id, "usuario", nombreUsuario));
    if (propios == 0) {
      throw new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, NO_ENCONTRADO);
    }
  }

  /** Marca todos los avisos de la persona como leídos. */
  @Transactional
  public void marcarTodos(String nombreUsuario) {
    jdbc.update(
        """
        UPDATE aviso a SET leido_en = now() FROM usuario u
        WHERE u.id = a.destinatario_id AND lower(u.nombre_usuario) = lower(:usuario)
          AND a.leido_en IS NULL
        """,
        Map.of("usuario", nombreUsuario));
  }
}
