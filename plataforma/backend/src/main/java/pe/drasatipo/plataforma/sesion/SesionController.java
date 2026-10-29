package pe.drasatipo.plataforma.sesion;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** Inicio y cierre de sesión (HU03, RF02). */
@RestController
@RequestMapping("/api/sesion")
public class SesionController {

  private final AutenticacionUsuarios autenticacion;
  private final UsuarioRepository usuarios;
  private final RolRepository roles;
  private final SecurityContextRepository contextos;
  private final CsrfAuthenticationStrategy renovarCsrf;

  public SesionController(
      AutenticacionUsuarios autenticacion,
      UsuarioRepository usuarios,
      RolRepository roles,
      SecurityContextRepository contextos,
      CsrfTokenRepository tokensCsrf) {
    this.autenticacion = autenticacion;
    this.usuarios = usuarios;
    this.roles = roles;
    this.contextos = contextos;
    this.renovarCsrf = new CsrfAuthenticationStrategy(tokensCsrf);
  }

  @PostMapping
  public SesionRespuesta iniciar(
      @Valid @RequestBody InicioSesionSolicitud datos,
      HttpServletRequest solicitud,
      HttpServletResponse respuesta) {
    var cuenta = autenticacion.autenticar(datos.nombreUsuario(), datos.contrasena());
    Authentication sesion =
        UsernamePasswordAuthenticationToken.authenticated(
            cuenta.identidad(),
            null,
            AuthorityUtils.createAuthorityList(cuenta.sesion().permisos()));

    // Nuevo identificador de sesión al autenticarse, contra la fijación de sesión.
    if (solicitud.getSession(false) != null) {
      solicitud.changeSessionId();
    }
    SecurityContext contexto = SecurityContextHolder.createEmptyContext();
    contexto.setAuthentication(sesion);
    SecurityContextHolder.setContext(contexto);
    contextos.saveContext(contexto, solicitud, respuesta);

    // Token CSRF nuevo para la sesión nueva; se lee para que viaje en la cookie.
    renovarCsrf.onAuthentication(sesion, solicitud, respuesta);
    if (solicitud.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
      token.getToken();
    }
    return cuenta.sesion();
  }

  /** Sesión actual. Sin sesión responde 401 con el motivo (por ejemplo, que expiró). */
  @GetMapping
  public SesionRespuesta actual(Authentication sesion) {
    UsuarioEnSesion enSesion = (UsuarioEnSesion) sesion.getPrincipal();
    Usuario cuenta = usuarios.findConRolById(enSesion.id()).orElseThrow();
    return SesionRespuesta.de(cuenta, roles.codigosDePermisos(cuenta.getRol().getId()));
  }

  @DeleteMapping
  public ResponseEntity<Void> cerrar(HttpServletRequest solicitud) {
    HttpSession sesion = solicitud.getSession(false);
    if (sesion != null) {
      sesion.invalidate();
    }
    SecurityContextHolder.clearContext();
    return ResponseEntity.noContent().build();
  }
}
