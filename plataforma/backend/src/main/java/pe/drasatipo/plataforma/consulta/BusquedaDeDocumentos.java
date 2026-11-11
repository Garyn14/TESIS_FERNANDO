package pe.drasatipo.plataforma.consulta;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;

/**
 * Buscar documentos (HU22, RF42). Busca a la vez por nombre, DNI, código de verificación, número de
 * expediente y número de lote, en los documentos de todas las áreas. Los certificados de un lote se
 * agrupan en la fila de su lote.
 */
@Service
public class BusquedaDeDocumentos {

  /** Filas que se muestran: un documento o un lote cuentan como una. */
  public static final int MAXIMO_DE_FILAS = 50;

  /** Documentos que se leen como máximo para armar las filas. */
  static final int MAXIMO_DE_DOCUMENTOS = 1000;

  static final int MINIMO_DE_CARACTERES = 2;
  static final String MUY_CORTO = "Escriba al menos 2 caracteres.";

  /** Quita las tildes en PostgreSQL, igual que {@link #normalizar} en Java. */
  private static final String SIN_TILDES = "translate(lower(%s), 'áéíóúüñ', 'aeiouun')";

  private static final String CONSULTA =
      """
      SELECT d.codigo, d.nombres, d.apellidos, d.dni, d.numero_expediente, d.registrado_en,
             d.estado, d.lote_id, l.numero AS lote, l.registrado_en AS lote_registrado_en,
             t.nombre AS tipo, a.nombre AS area
      FROM documento d
      JOIN tipo_documento t ON t.id = d.tipo_documento_id
      JOIN area a ON a.id = d.area_id
      LEFT JOIN lote l ON l.id = d.lote_id
      WHERE d.estado IN (:estados) %s
      ORDER BY COALESCE(l.registrado_en, d.registrado_en) DESC, d.lote_id, d.id
      LIMIT :limite
      """;

  private final NamedParameterJdbcTemplate jdbc;

  public BusquedaDeDocumentos(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Transactional(readOnly = true)
  public ResultadoDeBusqueda buscar(String texto, FiltroDeEstado filtro) {
    return buscar(texto, filtro, null);
  }

  /** DRA-58: con {@code area}, solo los documentos de esa área (Mesa de Partes de área). */
  @Transactional(readOnly = true)
  public ResultadoDeBusqueda buscar(String texto, FiltroDeEstado filtro, Short area) {
    String limpio = texto == null ? "" : texto.strip().replaceAll("\\s+", " ");
    if (!limpio.isEmpty() && limpio.replace(" ", "").length() < MINIMO_DE_CARACTERES) {
      throw new DatosInvalidosException(Map.of("texto", MUY_CORTO));
    }
    MapSqlParameterSource parametros =
        new MapSqlParameterSource()
            .addValue("estados", filtro.nombres())
            .addValue("limite", MAXIMO_DE_DOCUMENTOS + 1);
    String condicion = limpio.isEmpty() ? "" : "AND (" + condicion(limpio, parametros) + ")";
    if (area != null) {
      condicion += " AND d.area_id = :area";
      parametros.addValue("area", area);
    }
    if (filtro.sinEntregar()) {
      condicion +=
          " AND NOT EXISTS (SELECT 1 FROM documento_historial h WHERE h.documento_id = d.id"
              + " AND h.evento IN ('IMPRESO', 'DESCARGADO'))";
    }
    List<Encontrado> encontrados =
        jdbc.query(CONSULTA.formatted(condicion), parametros, BusquedaDeDocumentos::encontrado);
    boolean truncado = encontrados.size() > MAXIMO_DE_DOCUMENTOS;
    List<Encontrado> leidos = truncado ? encontrados.subList(0, MAXIMO_DE_DOCUMENTOS) : encontrados;
    return agrupar(leidos, truncado);
  }

  /**
   * El texto coincide con el nombre (todas sus palabras, en cualquier orden), el DNI, el código, el
   * expediente o el número de lote. Todo va como parámetro: nada del texto se concatena al SQL.
   */
  private static String condicion(String texto, MapSqlParameterSource parametros) {
    List<String> partes = new ArrayList<>();
    String[] palabras = normalizar(texto).split(" ");
    List<String> delNombre = new ArrayList<>();
    for (int i = 0; i < palabras.length; i++) {
      parametros.addValue("palabra" + i, contiene(palabras[i]));
      delNombre.add(SIN_TILDES.formatted("d.nombres || ' ' || d.apellidos") + " LIKE :palabra" + i);
    }
    partes.add("(" + String.join(" AND ", delNombre) + ")");
    parametros.addValue("texto", contiene(texto));
    parametros.addValue("minusculas", contiene(texto.toLowerCase(Locale.ROOT)));
    // El código se compara sin guiones ni espacios: "dra 2026 f8r2ma" o "F8R2MA".
    parametros.addValue(
        "codigo", contiene(texto.toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "")));
    partes.add("d.dni LIKE :texto");
    partes.add("replace(d.codigo, '-', '') LIKE :codigo");
    partes.add("lower(d.numero_expediente) LIKE :minusculas");
    partes.add("l.numero LIKE :texto");
    return String.join(" OR ", partes);
  }

  /** Minúsculas y sin tildes, para comparar nombres. */
  static String normalizar(String texto) {
    return Normalizer.normalize(texto, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT);
  }

  /** Patrón LIKE que contiene el texto, con los comodines escapados. */
  private static String contiene(String texto) {
    return "%" + texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
  }

  private record Encontrado(
      String codigo,
      String beneficiario,
      String dni,
      String numeroExpediente,
      OffsetDateTime registradoEn,
      EstadoDocumento estado,
      Long loteId,
      String lote,
      OffsetDateTime loteRegistradoEn,
      String tipo,
      String area) {

    FilaDeBusqueda fila() {
      return FilaDeBusqueda.documento(
          codigo, lote, tipo, beneficiario, dni, numeroExpediente, area, registradoEn, estado);
    }
  }

  private static Encontrado encontrado(ResultSet fila, int numero) throws SQLException {
    Long loteId = fila.getObject("lote_id", Long.class);
    return new Encontrado(
        fila.getString("codigo"),
        fila.getString("nombres") + " " + fila.getString("apellidos"),
        fila.getString("dni"),
        fila.getString("numero_expediente"),
        fila.getObject("registrado_en", OffsetDateTime.class),
        EstadoDocumento.valueOf(fila.getString("estado")),
        loteId,
        fila.getString("lote"),
        fila.getObject("lote_registrado_en", OffsetDateTime.class),
        fila.getString("tipo"),
        fila.getString("area"));
  }

  /** Agrupa los certificados de cada lote en su fila y corta en {@link #MAXIMO_DE_FILAS}. */
  private ResultadoDeBusqueda agrupar(List<Encontrado> encontrados, boolean truncado) {
    Map<Object, List<Encontrado>> grupos = new LinkedHashMap<>();
    for (Encontrado e : encontrados) {
      Object clave = e.loteId() == null ? e.codigo() : e.loteId();
      grupos.computeIfAbsent(clave, k -> new ArrayList<>()).add(e);
    }
    List<List<Encontrado>> mostrados = grupos.values().stream().limit(MAXIMO_DE_FILAS).toList();
    Map<Long, Integer> cantidades = cantidades(mostrados);
    List<FilaDeBusqueda> filas = new ArrayList<>();
    for (List<Encontrado> grupo : mostrados) {
      Encontrado primero = grupo.getFirst();
      if (primero.loteId() == null) {
        filas.add(primero.fila());
      } else {
        filas.add(
            FilaDeBusqueda.lote(
                primero.lote(),
                primero.tipo(),
                primero.area(),
                primero.loteRegistradoEn(),
                cantidades.get(primero.loteId()),
                grupo.stream().map(Encontrado::fila).toList()));
      }
    }
    return new ResultadoDeBusqueda(filas, truncado || grupos.size() > MAXIMO_DE_FILAS);
  }

  /** Cuántos certificados tiene en total cada lote mostrado, en cualquier estado. */
  private Map<Long, Integer> cantidades(List<List<Encontrado>> mostrados) {
    List<Long> lotes =
        mostrados.stream()
            .map(g -> g.getFirst().loteId())
            .filter(java.util.Objects::nonNull)
            .toList();
    Map<Long, Integer> cantidades = new HashMap<>();
    if (!lotes.isEmpty()) {
      jdbc.query(
          "SELECT lote_id, count(*) AS cantidad FROM documento WHERE lote_id IN (:lotes)"
              + " GROUP BY lote_id",
          Map.of("lotes", lotes),
          fila -> {
            cantidades.put(fila.getLong("lote_id"), fila.getInt("cantidad"));
          });
    }
    return cantidades;
  }
}
