package pe.drasatipo.plataforma.sesion;

import java.util.List;
import pe.drasatipo.plataforma.usuarios.Usuario;

/** Datos de la sesión para el frontend: con los permisos arma el menú (HU03). */
public record SesionRespuesta(
    String nombreUsuario,
    String nombreCompleto,
    String rol,
    String rolNombre,
    List<String> permisos,
    boolean debeCambiarContrasena) {

  static SesionRespuesta de(Usuario usuario, List<String> permisos) {
    return new SesionRespuesta(
        usuario.getNombreUsuario(),
        usuario.getNombreCompleto(),
        usuario.getRol().getCodigo(),
        usuario.getRol().getNombre(),
        permisos,
        usuario.isDebeCambiarContrasena());
  }
}
