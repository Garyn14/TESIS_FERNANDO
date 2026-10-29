package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** HU04: cambio de la contraseña propia. La confirmación se valida en el frontend. */
public record CambioContrasenaSolicitud(
    @NotBlank(message = "Ingrese su contraseña actual.") String contrasenaActual,
    @NotBlank(message = "Ingrese la contraseña nueva.")
        @Size(
            min = Contrasenas.LONGITUD_MINIMA,
            max = Contrasenas.LONGITUD_MAXIMA,
            message = "La contraseña debe tener de 8 a 20 caracteres.")
        String contrasenaNueva) {

  /** Las contraseñas nunca se muestran, ni siquiera en los registros. */
  @Override
  public String toString() {
    return "CambioContrasenaSolicitud[***]";
  }
}
