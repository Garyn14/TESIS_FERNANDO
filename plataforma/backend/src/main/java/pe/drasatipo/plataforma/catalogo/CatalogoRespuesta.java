package pe.drasatipo.plataforma.catalogo;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Pantalla "Áreas y documentos" (DRA-60): las áreas activas con lo que emite cada una, los tipos de
 * documento que se pueden asignar y los cambios más recientes.
 */
public record CatalogoRespuesta(
    List<AreaConfigurada> areas, List<TipoDeDocumento> tipos, List<Cambio> historial) {

  /**
   * Un área con sus tipos asignados y la cantidad de personas activas con el rol Emisor de área.
   */
  public record AreaConfigurada(
      String codigo, String nombre, int personasActivas, List<TipoDeDocumento> tipos) {}

  public record TipoDeDocumento(String codigo, String nombre, String origen) {}

  public record Cambio(
      String area,
      String evento,
      String detalle,
      String realizadoPor,
      OffsetDateTime realizadoEn) {}
}
