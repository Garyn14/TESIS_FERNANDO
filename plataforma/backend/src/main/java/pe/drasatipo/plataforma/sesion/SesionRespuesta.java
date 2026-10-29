package pe.drasatipo.plataforma.sesion;

import java.util.List;
import pe.drasatipo.plataforma.usuarios.Usuario;

/** Datos de la sesión para el frontend: con los permisos arma el menú (HU03). */
public record SesionRespuesta(
    String nombreUsuario,
    String nombreCompleto,
    String rol,
    String rolNombre,
    /** Nombre del área (HU05), o null. Se muestra junto al rol en el encabezado. */
    String areaNombre,
    List<String> permisos,
    boolean debeCambiarContrasena) {

  static SesionRespuesta de(Usuario usuario, List<String> permisos) {
    return new SesionRespuesta(
        usuario.getNombreUsuario(),
        usuario.getNombreCompleto(),
        usuario.getRol().getCodigo(),
        usuario.getRol().getNombre(),
        usuario.getArea() == null ? null : usuario.getArea().getNombre(),
        permisos,
        usuario.isDebeCambiarContrasena());
  }
}
