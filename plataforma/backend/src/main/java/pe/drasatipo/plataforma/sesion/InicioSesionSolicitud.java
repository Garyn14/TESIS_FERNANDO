package pe.drasatipo.plataforma.sesion;

import jakarta.validation.constraints.NotBlank;

public record InicioSesionSolicitud(
    @NotBlank(message = "Ingrese su usuario.") String nombreUsuario,
    @NotBlank(message = "Ingrese su contraseña.") String contrasena) {

  /** La contraseña nunca se muestra, ni siquiera en los registros. */
  @Override
  public String toString() {
    return "InicioSesionSolicitud[nombreUsuario=%s]".formatted(nombreUsuario);
  }
}
