package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos editables de una cuenta (HU02). El nombre de usuario y la contraseña no se editan aquí. */
public record EdicionCuentaSolicitud(
    @NotBlank(message = "Ingrese el nombre completo.")
        @Size(min = 3, max = 150, message = "El nombre completo debe tener de 3 a 150 caracteres.")
        String nombreCompleto,
    @NotBlank(message = "Seleccione un rol.") String rol) {

  EdicionCuentaSolicitud normalizada() {
    return new EdicionCuentaSolicitud(nombreCompleto == null ? null : nombreCompleto.strip(), rol);
  }
}
