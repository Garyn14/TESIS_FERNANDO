package pe.drasatipo.plataforma.sesion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Spring Security genera el token CSRF solo cuando alguien lo lee. Este filtro lo lee en cada
 * solicitud para que la cookie XSRF-TOKEN llegue al frontend desde la primera respuesta.
 */
class CsrfCookieFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(
      HttpServletRequest solicitud, HttpServletResponse respuesta, FilterChain cadena)
      throws ServletException, IOException {
    if (solicitud.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
      token.getToken();
    }
    cadena.doFilter(solicitud, respuesta);
  }
}
