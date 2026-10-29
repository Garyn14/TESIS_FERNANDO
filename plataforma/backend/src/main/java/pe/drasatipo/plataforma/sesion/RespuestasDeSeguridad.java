package pe.drasatipo.plataforma.sesion;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * Respuestas 401 y 403 con el mismo formato de error que el resto de la API, y con un mensaje que
 * explica por qué no hay sesión (HU03).
 */
final class RespuestasDeSeguridad {

  /** Atributo de la solicitud con el motivo por el que se cerró la sesión. */
  static final String MOTIVO = RespuestasDeSeguridad.class.getName() + ".motivo";

  static final String SESION_EXPIRADA =
      "Su sesión expiró por inactividad. Inicie sesión nuevamente.";
  static final String SIN_SESION = "Inicie sesión para continuar.";
  static final String CUENTA_DESACTIVADA =
      "Su cuenta fue desactivada. Comuníquese con el Administrador.";
  static final String SIN_PERMISO = "No tiene permiso para realizar esta acción.";

  private RespuestasDeSeguridad() {}

  static AuthenticationEntryPoint sinSesion() {
    return (solicitud, respuesta, e) ->
        escribir(respuesta, HttpStatus.UNAUTHORIZED, motivoSinSesion(solicitud));
  }

  static AccessDeniedHandler sinPermiso() {
    return (solicitud, respuesta, e) -> escribir(respuesta, HttpStatus.FORBIDDEN, SIN_PERMISO);
  }

  private static String motivoSinSesion(HttpServletRequest solicitud) {
    if (solicitud.getAttribute(MOTIVO) instanceof String motivo) {
      return motivo;
    }
    // El navegador envió una cookie de sesión que el servidor ya no reconoce: expiró.
    if (solicitud.getRequestedSessionId() != null && !solicitud.isRequestedSessionIdValid()) {
      return SESION_EXPIRADA;
    }
    return SIN_SESION;
  }

  private static void escribir(HttpServletResponse respuesta, HttpStatus estado, String mensaje)
      throws IOException {
    respuesta.setStatus(estado.value());
    respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
    respuesta.setCharacterEncoding("UTF-8");
    // Los mensajes son constantes sin comillas: no hace falta escapar.
    respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\",\"campos\":{}}");
  }
}
