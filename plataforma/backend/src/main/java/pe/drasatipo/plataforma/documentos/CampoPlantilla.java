package pe.drasatipo.plataforma.documentos;

import java.util.List;

/**
 * Un campo propio del formulario de un tipo de documento (HU08, HU09). El frontend arma el
 * formulario con esta definición y el servidor valida con la misma.
 */
public record CampoPlantilla(
    String nombre, String etiqueta, Tipo tipo, String ayuda, List<String> opciones, int maximo) {

  public enum Tipo {
    TEXTO,
    FECHA,
    OPCION,
    /** Número entero, de 1 a {@code maximo}. */
    NUMERO
  }

  static CampoPlantilla texto(String nombre, String etiqueta, String ayuda) {
    return texto(nombre, etiqueta, ayuda, 100);
  }

  static CampoPlantilla texto(String nombre, String etiqueta, String ayuda, int maximo) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.TEXTO, ayuda, List.of(), maximo);
  }

  static CampoPlantilla fecha(String nombre, String etiqueta) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.FECHA, null, List.of(), 0);
  }

  static CampoPlantilla opcion(String nombre, String etiqueta, List<String> opciones) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.OPCION, null, opciones, 0);
  }

  static CampoPlantilla numero(String nombre, String etiqueta, String ayuda, int maximo) {
    return new CampoPlantilla(nombre, etiqueta, Tipo.NUMERO, ayuda, List.of(), maximo);
  }
}
