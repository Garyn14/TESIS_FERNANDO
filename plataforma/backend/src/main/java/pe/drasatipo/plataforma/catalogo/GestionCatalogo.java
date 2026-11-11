package pe.drasatipo.plataforma.catalogo;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Rol;

/**
 * Configuración de qué tipos de documento emite cada área (DRA-60, RF06). La regla que la aplica
 * sigue siendo una sola, {@code AlcanceDeArea}, que lee esta relación en cada solicitud: el cambio
 * rige desde la siguiente pantalla de las personas del área. La asignación solo controla el
 * registro de documentos nuevos; lo ya registrado sigue su trámite.
 */
@Service
public class GestionCatalogo {

  static final String AREA_INEXISTENTE = "No existe un área activa con el código %s.";
  static final String TIPO_INEXISTENTE = "No existe un tipo de documento activo con el código %s.";
  static final String YA_ASIGNADO = "«%s» ya tenía asignado «%s».";
  static final String NO_ASIGNADO = "«%s» no tiene asignado «%s».";
  static final int CAMBIOS_RECIENTES = 30;

  private record Fila(short id, String codigo, String nombre) {}

  private final NamedParameterJdbcTemplate jdbc;

  public GestionCatalogo(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Transactional(readOnly = true)
  public CatalogoRespuesta consultar() {
    Map<String, List<CatalogoRespuesta.TipoDeDocumento>> tiposPorArea = new LinkedHashMap<>();
    jdbc.query(
        """
        SELECT a.codigo AS area, t.codigo, t.nombre, t.origen
        FROM area_tipo_documento at
        JOIN area a ON a.id = at.area_id
        JOIN tipo_documento t ON t.id = at.tipo_documento_id
        WHERE a.activa AND t.activo
        ORDER BY t.nombre
        """,
        fila -> {
          tiposPorArea
              .computeIfAbsent(fila.getString("area"), k -> new ArrayList<>())
              .add(
                  new CatalogoRespuesta.TipoDeDocumento(
                      fila.getString("codigo"),
                      fila.getString("nombre"),
                      fila.getString("origen")));
        });
    List<CatalogoRespuesta.AreaConfigurada> areas =
        jdbc.query(
            """
            SELECT a.codigo, a.nombre,
                   (SELECT count(*) FROM usuario u JOIN rol r ON r.id = u.rol_id
                    WHERE u.area_id = a.id AND u.activo AND r.codigo = :emisor) AS personas
            FROM area a WHERE a.activa ORDER BY a.nombre
            """,
            Map.of("emisor", Rol.AREA_ENCARGADA),
            (fila, n) ->
                new CatalogoRespuesta.AreaConfigurada(
                    fila.getString("codigo"),
                    fila.getString("nombre"),
                    fila.getInt("personas"),
                    tiposPorArea.getOrDefault(fila.getString("codigo"), List.of())));
    List<CatalogoRespuesta.TipoDeDocumento> tipos =
        jdbc.query(
            "SELECT codigo, nombre, origen FROM tipo_documento WHERE activo ORDER BY nombre",
            (fila, n) ->
                new CatalogoRespuesta.TipoDeDocumento(
                    fila.getString("codigo"), fila.getString("nombre"), fila.getString("origen")));
    List<CatalogoRespuesta.Cambio> historial =
        jdbc.query(
            """
            SELECT a.nombre AS area, h.evento, h.detalle, u.nombre_completo, h.realizado_en
            FROM catalogo_historial h
            JOIN area a ON a.id = h.area_id
            JOIN usuario u ON u.id = h.realizado_por
            ORDER BY h.realizado_en DESC, h.id DESC
            LIMIT :limite
            """,
            Map.of("limite", CAMBIOS_RECIENTES),
            (fila, n) ->
                new CatalogoRespuesta.Cambio(
                    fila.getString("area"),
                    fila.getString("evento"),
                    fila.getString("detalle"),
                    fila.getString("nombre_completo"),
                    fila.getObject("realizado_en", OffsetDateTime.class)));
    return new CatalogoRespuesta(areas, tipos, historial);
  }

  /** Asigna un tipo a un área. Una sola sentencia: si ya estaba asignado, no cambia nada. */
  @Transactional
  public CatalogoRespuesta asignar(String codigoArea, String codigoTipo, long actor) {
    Fila area = area(codigoArea);
    Fila tipo = tipo(codigoTipo);
    int filas =
        jdbc.update(
            """
            INSERT INTO area_tipo_documento (area_id, tipo_documento_id) VALUES (:area, :tipo)
            ON CONFLICT DO NOTHING
            """,
            Map.of("area", area.id(), "tipo", tipo.id()));
    if (filas == 0) {
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT, null, YA_ASIGNADO.formatted(area.nombre(), tipo.nombre()));
    }
    registrar(area, EventoCatalogo.TIPO_ASIGNADO, "se asignó " + tipo.nombre(), actor);
    return consultar();
  }

  /** Quita un tipo a un área. Solo impide registrar documentos nuevos de ese tipo en el área. */
  @Transactional
  public CatalogoRespuesta quitar(String codigoArea, String codigoTipo, long actor) {
    Fila area = area(codigoArea);
    Fila tipo = tipo(codigoTipo);
    int filas =
        jdbc.update(
            "DELETE FROM area_tipo_documento WHERE area_id = :area AND tipo_documento_id = :tipo",
            Map.of("area", area.id(), "tipo", tipo.id()));
    if (filas == 0) {
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT, null, NO_ASIGNADO.formatted(area.nombre(), tipo.nombre()));
    }
    registrar(area, EventoCatalogo.TIPO_QUITADO, "se quitó " + tipo.nombre(), actor);
    return consultar();
  }

  private void registrar(Fila area, EventoCatalogo evento, String cambio, long actor) {
    jdbc.update(
        """
        INSERT INTO catalogo_historial (area_id, evento, detalle, realizado_por)
        VALUES (:area, :evento, :detalle, :actor)
        """,
        Map.of(
            "area",
            area.id(),
            "evento",
            evento.name(),
            "detalle",
            area.nombre() + ": " + cambio,
            "actor",
            actor));
  }

  private Fila area(String codigo) {
    return jdbc
        .query(
            "SELECT id, codigo, nombre FROM area WHERE codigo = :codigo AND activa",
            Map.of("codigo", codigo),
            (f, n) -> new Fila(f.getShort("id"), f.getString("codigo"), f.getString("nombre")))
        .stream()
        .findFirst()
        .orElseThrow(() ->
            new ReglaDeNegocioException(
                HttpStatus.NOT_FOUND, null, AREA_INEXISTENTE.formatted(codigo)));
  }

  private Fila tipo(String codigo) {
    return jdbc
        .query(
            "SELECT id, codigo, nombre FROM tipo_documento WHERE codigo = :codigo AND activo",
            Map.of("codigo", codigo),
            (f, n) -> new Fila(f.getShort("id"), f.getString("codigo"), f.getString("nombre")))
        .stream()
        .findFirst()
        .orElseThrow(() ->
            new ReglaDeNegocioException(
                HttpStatus.NOT_FOUND, null, TIPO_INEXISTENTE.formatted(codigo)));
  }
}
