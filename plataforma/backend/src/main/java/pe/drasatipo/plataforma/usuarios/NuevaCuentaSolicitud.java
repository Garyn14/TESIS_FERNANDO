package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos para crear una cuenta (HU01). El nombre de usuario llega ya normalizado a minúsculas: ver
 * {@link GestionUsuarios#crear}.
 */
public record NuevaCuentaSolicitud(
    @NotBlank(message = "Ingrese el nombre de usuario.")
        @Pattern(
            regexp = "^[a-z][a-z0-9._]{3,29}$",
            message =
                "Use de 4 a 30 caracteres: letras sin tildes, números, punto o guion bajo,"
                    + " empezando con una letra.")
        String nombreUsuario,
    @NotBlank(message = "Ingrese el nombre completo.")
        @Size(min = 3, max = 150, message = "El nombre completo debe tener de 3 a 150 caracteres.")
        String nombreCompleto,
    @NotBlank(message = "Seleccione un rol.") String rol,
    /** Código del área. Obligatoria solo para el rol Área encargada (HU05). */
    String area,
    @NotBlank(message = "Ingrese la contraseña temporal.")
        @Size(
            min = Contrasenas.LONGITUD_MINIMA,
            max = Contrasenas.LONGITUD_MAXIMA,
            message = "La contraseña debe tener de 8 a 20 caracteres.")
        String contrasenaTemporal) {

  /** Quita espacios y pasa el nombre de usuario a minúsculas antes de validar. */
  NuevaCuentaSolicitud normalizada() {
    return new NuevaCuentaSolicitud(
        nombreUsuario == null ? null : nombreUsuario.strip().toLowerCase(java.util.Locale.ROOT),
        nombreCompleto == null ? null : nombreCompleto.strip(),
        rol,
        area,
        contrasenaTemporal);
  }

  /** La contraseña nunca se muestra, ni siquiera en los registros. */
  @Override
  public String toString() {
    return "NuevaCuentaSolicitud[nombreUsuario=%s, nombreCompleto=%s, rol=%s, area=%s]"
        .formatted(nombreUsuario, nombreCompleto, rol, area);
  }
}
