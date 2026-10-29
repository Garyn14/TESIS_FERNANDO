package pe.drasatipo.plataforma.comun;

import java.util.Map;

/** Uno o más campos de la solicitud no cumplen sus reglas. Se responde con 400. */
public class DatosInvalidosException extends RuntimeException {

  private final Map<String, String> campos;

  public DatosInvalidosException(Map<String, String> campos) {
    super("Revise los datos ingresados.");
    this.campos = Map.copyOf(campos);
  }

  public Map<String, String> getCampos() {
    return campos;
  }
}
