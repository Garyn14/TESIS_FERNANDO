package pe.drasatipo.plataforma.sesion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * RF04: el servidor valida el permiso en cada solicitud con los datos actuales de la cuenta. Si la
 * cuenta se desactivó (HU02), cierra la sesión; si cambió de rol, aplica los permisos nuevos.
 */
class CuentaEnSesionFilter extends OncePerRequestFilter {

  private final UsuarioRepository usuarios;
  private final RolRepository roles;

  CuentaEnSesionFilter(UsuarioRepository usuarios, RolRepository roles) {
    this.usuarios = usuarios;
    this.roles = roles;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest solicitud, HttpServletResponse respuesta, FilterChain cadena)
      throws ServletException, IOException {
    SecurityContext contexto = SecurityContextHolder.getContext();
    Authentication autenticacion = contexto.getAuthentication();
    if (autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioEnSesion enSesion) {
      Optional<Usuario> cuenta = usuarios.findConRolById(enSesion.id());
      if (cuenta.isEmpty() || !cuenta.get().isActivo()) {
        cerrarSesion(solicitud);
      } else {
        var permisos = roles.codigosDePermisos(cuenta.get().getRol().getId());
        contexto.setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                enSesion, null, AuthorityUtils.createAuthorityList(permisos)));
      }
    }
    cadena.doFilter(solicitud, respuesta);
  }

  private static void cerrarSesion(HttpServletRequest solicitud) {
    solicitud.setAttribute(RespuestasDeSeguridad.MOTIVO, RespuestasDeSeguridad.CUENTA_DESACTIVADA);
    SecurityContextHolder.clearContext();
    HttpSession sesion = solicitud.getSession(false);
    if (sesion != null) {
      sesion.invalidate();
    }
  }
}
