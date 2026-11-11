package pe.drasatipo.plataforma.catalogo;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
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
 *
 * <p>DRA-61: también crea, renombra, deshabilita y reactiva áreas. Las áreas no se eliminan: tienen
 * documentos e historial.
 */
@Service
public class GestionCatalogo {

  static final String AREA_INEXISTENTE = "No existe un área activa con el código %s.";
  static final String TIPO_INEXISTENTE = "No existe un tipo de documento activo con el código %s.";
  static final String YA_ASIGNADO = "«%s» ya tenía asignado «%s».";
  static final String NO_ASIGNADO = "«%s» no tiene asignado «%s».";
  static final int CAMBIOS_RECIENTES = 30;
  static final String NOMBRE_LONGITUD = "El nombre del área debe tener entre 3 y 100 caracteres.";
  static final String NOMBRE_DUPLICADO = "Ya existe un área con ese nombre.";
  static final String NOMBRE_IGUAL = "El nombre nuevo es igual al actual.";
  static final String AREA_NO_EXISTE = "No existe un área con el código %s.";
  static final String CON_PERSONAS =
      "No se puede deshabilitar: el área tiene %d %s. Muévalas a otra área desde Usuarios.";
  static final String YA_DESHABILITADA = "«%s» ya está deshabilitada.";
  static final String YA_ACTIVA = "«%s» ya está activa.";

  /** La misma expresión del índice único de V26: sin mayúsculas ni tildes. */
  static final String NOMBRE_NORMALIZADO = "translate(lower(%s), 'áéíóúüàèìòù', 'aeiouuaeiou')";

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
        WHERE t.activo
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
            SELECT a.codigo, a.nombre, a.activa,
                   (SELECT count(*) FROM usuario u JOIN rol r ON r.id = u.rol_id
                    WHERE u.area_id = a.id AND u.activo AND r.codigo = :emisor) AS personas
            FROM area a ORDER BY a.activa DESC, a.nombre
            """,
            Map.of("emisor", Rol.AREA_ENCARGADA),
            (fila, n) ->
                new CatalogoRespuesta.AreaConfigurada(
                    fila.getString("codigo"),
                    fila.getString("nombre"),
                    fila.getBoolean("activa"),
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

  /** DRA-61: crea un área activa y sin tipos de documento. Su código sale del nombre. */
  @Transactional
  public CatalogoRespuesta crearArea(String nombrePedido, long actor) {
    String nombre = nombreValido(nombrePedido);
    exigirNombreLibre(nombre, null);
    String codigo = codigoLibre(codigoDe(nombre));
    Short id;
    try {
      id =
          jdbc.queryForObject(
              "INSERT INTO area (codigo, nombre) VALUES (:codigo, :nombre) RETURNING id",
              Map.of("codigo", codigo, "nombre", nombre),
              Short.class);
    } catch (DuplicateKeyException carrera) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "nombre", NOMBRE_DUPLICADO);
    }
    registrarDetalle(id, EventoCatalogo.AREA_CREADA, nombre + ": se creó el área", actor);
    return consultar();
  }

  /**
   * DRA-61: cambia el nombre de un área activa. El código no cambia, y lo ya guardado como texto
   * (el historial, el área organizadora de los lotes) conserva el nombre anterior.
   */
  @Transactional
  public CatalogoRespuesta renombrarArea(String codigoArea, String nombrePedido, long actor) {
    Fila area = area(codigoArea);
    String nombre = nombreValido(nombrePedido);
    if (nombre.equals(area.nombre())) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "nombre", NOMBRE_IGUAL);
    }
    exigirNombreLibre(nombre, area.id());
    try {
      jdbc.update(
          "UPDATE area SET nombre = :nombre WHERE id = :id AND nombre = :anterior",
          Map.of("nombre", nombre, "id", area.id(), "anterior", area.nombre()));
    } catch (DuplicateKeyException carrera) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "nombre", NOMBRE_DUPLICADO);
    }
    registrarDetalle(
        area.id(),
        EventoCatalogo.AREA_RENOMBRADA,
        "Nombre: %s → %s".formatted(area.nombre(), nombre),
        actor);
    return consultar();
  }

  /**
   * DRA-61: deshabilita un área que no tiene personas activas. Una sola sentencia condicionada,
   * para que nadie quede activo en un área deshabilitada.
   */
  @Transactional
  public CatalogoRespuesta deshabilitarArea(String codigoArea, long actor) {
    EstadoArea area = cualquierArea(codigoArea);
    int filas =
        jdbc.update(
            """
            UPDATE area SET activa = false
            WHERE id = :id AND activa
              AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.area_id = area.id AND u.activo)
            """,
            Map.of("id", area.id()));
    if (filas == 0) {
      if (!area.activa()) {
        throw new ReglaDeNegocioException(
            HttpStatus.CONFLICT, null, YA_DESHABILITADA.formatted(area.nombre()));
      }
      Integer personas =
          jdbc.queryForObject(
              "SELECT count(*) FROM usuario WHERE area_id = :id AND activo",
              Map.of("id", area.id()),
              Integer.class);
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT,
          null,
          CON_PERSONAS.formatted(personas, personas == 1 ? "persona activa" : "personas activas"));
    }
    registrarDetalle(
        area.id(), EventoCatalogo.AREA_DESHABILITADA, area.nombre() + ": se deshabilitó", actor);
    return consultar();
  }

  /** DRA-61: reactiva un área deshabilitada, con los tipos de documento que conservaba. */
  @Transactional
  public CatalogoRespuesta reactivarArea(String codigoArea, long actor) {
    EstadoArea area = cualquierArea(codigoArea);
    int filas =
        jdbc.update(
            "UPDATE area SET activa = true WHERE id = :id AND NOT activa", Map.of("id", area.id()));
    if (filas == 0) {
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT, null, YA_ACTIVA.formatted(area.nombre()));
    }
    registrarDetalle(
        area.id(), EventoCatalogo.AREA_REACTIVADA, area.nombre() + ": se reactivó", actor);
    return consultar();
  }

  /** Sin espacios de más; de 3 a 100 caracteres. */
  static String nombreValido(String pedido) {
    String nombre = pedido == null ? "" : pedido.strip().replaceAll("\\s+", " ");
    if (nombre.length() < 3 || nombre.length() > 100) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "nombre", NOMBRE_LONGITUD);
    }
    return nombre;
  }

  private void exigirNombreLibre(String nombre, Short excepto) {
    Boolean existe =
        jdbc.queryForObject(
            """
            SELECT EXISTS (SELECT 1 FROM area WHERE %s = %s AND id <> :excepto)
            """
                .formatted(
                    NOMBRE_NORMALIZADO.formatted("nombre"),
                    NOMBRE_NORMALIZADO.formatted(":nombre")),
            Map.of("nombre", nombre, "excepto", excepto == null ? -1 : excepto),
            Boolean.class);
    if (Boolean.TRUE.equals(existe)) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "nombre", NOMBRE_DUPLICADO);
    }
  }

  /**
   * Mayúsculas, sin tildes y con guiones bajos, sin el prefijo "Área de", como los de V3: "Área de
   * Capacitación y Extensión" → CAPACITACION_Y_EXTENSION.
   */
  static String codigoDe(String nombre) {
    String codigo =
        Normalizer.normalize(nombre, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toUpperCase(java.util.Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "")
            .replaceFirst("^AREA_(DE_(LA_|LOS_|LAS_)?|DEL_)?", "");
    if (codigo.isEmpty()) {
      codigo = "AREA";
    }
    return codigo.length() > 26 ? codigo.substring(0, 26).replaceAll("_+$", "") : codigo;
  }

  /** Si el código ya existe, le agrega _2, _3, … (máximo 30 caracteres). */
  private String codigoLibre(String base) {
    String codigo = base;
    for (int n = 2; existeCodigo(codigo); n++) {
      codigo = base + "_" + n;
    }
    return codigo;
  }

  private boolean existeCodigo(String codigo) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM area WHERE codigo = :codigo)",
            Map.of("codigo", codigo),
            Boolean.class));
  }

  private record EstadoArea(short id, String nombre, boolean activa) {}

  private EstadoArea cualquierArea(String codigo) {
    return jdbc
        .query(
            "SELECT id, nombre, activa FROM area WHERE codigo = :codigo",
            Map.of("codigo", codigo),
            (f, n) ->
                new EstadoArea(f.getShort("id"), f.getString("nombre"), f.getBoolean("activa")))
        .stream()
        .findFirst()
        .orElseThrow(() ->
            new ReglaDeNegocioException(
                HttpStatus.NOT_FOUND, null, AREA_NO_EXISTE.formatted(codigo)));
  }

  private void registrar(Fila area, EventoCatalogo evento, String cambio, long actor) {
    registrarDetalle(area.id(), evento, area.nombre() + ": " + cambio, actor);
  }

  private void registrarDetalle(short area, EventoCatalogo evento, String detalle, long actor) {
    jdbc.update(
        """
        INSERT INTO catalogo_historial (area_id, evento, detalle, realizado_por)
        VALUES (:area, :evento, :detalle, :actor)
        """,
        Map.of("area", area, "evento", evento.name(), "detalle", detalle, "actor", actor));
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
