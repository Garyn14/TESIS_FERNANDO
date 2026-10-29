package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** HU04: contraseña temporal que el Administrador asigna a una cuenta. */
public record RestablecimientoSolicitud(
    @NotBlank(message = "Ingrese la contraseña temporal.")
        @Size(
            min = Contrasenas.LONGITUD_MINIMA,
            max = Contrasenas.LONGITUD_MAXIMA,
            message = "La contraseña debe tener de 8 a 20 caracteres.")
        String contrasenaTemporal) {

  @Override
  public String toString() {
    return "RestablecimientoSolicitud[***]";
  }
}
