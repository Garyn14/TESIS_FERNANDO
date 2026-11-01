package pe.drasatipo.plataforma.documentos;

import java.util.List;

/**
 * Un campo propio del formulario de un tipo de documento (HU08). El frontend arma el formulario con
 * esta definición y el servidor valida con la misma.
 */
public record CampoPlantilla(
    String nombre, String etiqueta, Tipo tipo, String ayuda, List<String> opciones) {

  public enum Tipo {
    TEXTO,
    FECHA,
    OPCION
  }

  static CampoPlantilla texto(String nombre, String etiqueta, String ayuda) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.TEXTO, ayuda, List.of());
  }

  static CampoPlantilla fecha(String nombre, String etiqueta) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.FECHA, null, List.of());
  }

  static CampoPlantilla opcion(String nombre, String etiqueta, List<String> opciones) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.OPCION, null, opciones);
  }
}
