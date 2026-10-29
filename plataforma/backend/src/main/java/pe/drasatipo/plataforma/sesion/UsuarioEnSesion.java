package pe.drasatipo.plataforma.sesion;

import java.io.Serializable;
import org.springframework.security.core.AuthenticatedPrincipal;

/**
 * Identidad guardada en la sesión. Solo el id y el nombre de usuario: el rol, los permisos y el
 * estado se vuelven a leer de la base de datos en cada solicitud (RF04).
 */
public record UsuarioEnSesion(Long id, String nombreUsuario)
    implements AuthenticatedPrincipal, Serializable {

  @Override
  public String getName() {
    return nombreUsuario;
  }
}
