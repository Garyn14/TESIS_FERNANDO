package pe.drasatipo.plataforma.sesion;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.stereotype.Component;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** Piezas de la sesión que se agregan a la cadena de filtros de Spring Security (HU03). */
@Component
public class SeguridadDeSesion {

  private final UsuarioRepository usuarios;
  private final RolRepository roles;

  public SeguridadDeSesion(UsuarioRepository usuarios, RolRepository roles) {
    this.usuarios = usuarios;
    this.roles = roles;
  }

  public void aplicar(HttpSecurity http) throws Exception {
    http.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
        .addFilterBefore(new CuentaEnSesionFilter(usuarios, roles), AuthorizationFilter.class)
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(RespuestasDeSeguridad.sinSesion())
                    .accessDeniedHandler(RespuestasDeSeguridad.sinPermiso()));
  }
}
