package pe.drasatipo.plataforma.sesion;

import java.io.Serializable;
import java.time.Instant;
import org.springframework.security.core.AuthenticatedPrincipal;

/**
 * Identidad guardada en la sesión. El rol, los permisos y el estado se vuelven a leer de la base de
 * datos en cada solicitud (RF04).
 *
 * @param credencialesDesde momento del último cambio de contraseña que conoce esta sesión. Si la
 *     contraseña cambia después (desde otra sesión o por restablecimiento), la sesión se cierra
 *     (HU04).
 */
public record UsuarioEnSesion(Long id, String nombreUsuario, Instant credencialesDesde)
    implements AuthenticatedPrincipal, Serializable {

  @Override
  public String getName() {
    return nombreUsuario;
  }
}
