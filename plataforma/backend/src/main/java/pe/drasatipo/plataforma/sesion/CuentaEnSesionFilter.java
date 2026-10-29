package pe.drasatipo.plataforma.sesion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
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
 * cuenta se desactivó (HU02) o su contraseña cambió después de iniciar la sesión (HU04), cierra la
 * sesión; si cambió de rol, aplica los permisos nuevos; con contraseña temporal, solo permite
 * cambiarla (HU04).
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
        cerrarSesion(solicitud, RespuestasDeSeguridad.CUENTA_DESACTIVADA);
      } else if (cuenta.get().getContrasenaCambiadaEn().isAfter(enSesion.credencialesDesde())) {
        // HU04: la contraseña cambió después de iniciar esta sesión.
        cerrarSesion(
            solicitud,
            cuenta.get().isDebeCambiarContrasena()
                ? RespuestasDeSeguridad.CONTRASENA_RESTABLECIDA
                : RespuestasDeSeguridad.CONTRASENA_CAMBIADA);
      } else if (cuenta.get().isDebeCambiarContrasena() && !permitidaConTemporal(solicitud)) {
        // HU04: con contraseña temporal solo se puede cambiarla, consultar o cerrar la sesión.
        RespuestasDeSeguridad.escribir(
            respuesta, HttpStatus.FORBIDDEN, RespuestasDeSeguridad.DEBE_CAMBIAR);
        return;
      } else {
        var permisos = roles.codigosDePermisos(cuenta.get().getRol().getId());
        contexto.setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                enSesion, null, AuthorityUtils.createAuthorityList(permisos)));
      }
    }
    cadena.doFilter(solicitud, respuesta);
  }

  private static boolean permitidaConTemporal(HttpServletRequest solicitud) {
    String ruta = solicitud.getRequestURI();
    String metodo = solicitud.getMethod();
    return ("/api/sesion".equals(ruta) && ("GET".equals(metodo) || "DELETE".equals(metodo)))
        || ("/api/sesion/contrasena".equals(ruta) && "PUT".equals(metodo));
  }

  private static void cerrarSesion(HttpServletRequest solicitud, String motivo) {
    solicitud.setAttribute(RespuestasDeSeguridad.MOTIVO, motivo);
    SecurityContextHolder.clearContext();
    HttpSession sesion = solicitud.getSession(false);
    if (sesion != null) {
      sesion.invalidate();
    }
  }
}
