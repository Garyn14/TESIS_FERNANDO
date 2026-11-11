package pe.drasatipo.plataforma.catalogo;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Pantalla "Áreas y documentos" (DRA-60, DRA-61): las áreas, activas y deshabilitadas, con lo que
 * emite cada una, los tipos de documento que se pueden asignar y los cambios más recientes.
 */
public record CatalogoRespuesta(
    List<AreaConfigurada> areas, List<TipoDeDocumento> tipos, List<Cambio> historial) {

  /**
   * Un área con sus tipos asignados y la cantidad de personas activas con el rol Emisor de área. Un
   * área deshabilitada conserva sus tipos, que vuelven a regir al reactivarla (DRA-61).
   */
  public record AreaConfigurada(
      String codigo,
      String nombre,
      boolean activa,
      int personasActivas,
      List<TipoDeDocumento> tipos) {}

  /** DRA-61: el nombre de un área nueva o el nombre nuevo de un área. */
  public record SolicitudArea(String nombre) {}

  public record TipoDeDocumento(String codigo, String nombre, String origen) {}

  public record Cambio(
      String area,
      String evento,
      String detalle,
      String realizadoPor,
      OffsetDateTime realizadoEn) {}
}
