package pe.drasatipo.plataforma.documentos;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Utilidades compartidas por las pruebas de HU08: cuentas con sesión real y solicitudes. */
final class RegistroSolicitudDePartePrueba {

  static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();
  private static final AtomicInteger expedientes = new AtomicInteger(100000);

  private RegistroSolicitudDePartePrueba() {}

  /** Inicia sesión con una cuenta nueva, con contraseña propia, creada directamente en la base. */
  static MockHttpSession sesion(
      MockMvc mvc, JdbcTemplate jdbc, PasswordEncoder codificador, String rol, String area)
      throws Exception {
    String usuario = "doc" + secuencia.incrementAndGet();
    jdbc.update(
        """
        INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id, area_id)
        SELECT ?, ?, ?, r.id, (SELECT id FROM area WHERE codigo = ?) FROM rol r WHERE r.codigo = ?
        """,
        usuario,
        "Persona " + usuario,
        codificador.encode(CLAVE),
        area,
        rol);
    return (MockHttpSession)
        mvc.perform(
                post("/api/sesion")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"nombreUsuario\": \"%s\", \"contrasena\": \"%s\"}"
                            .formatted(usuario, CLAVE)))
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession();
  }

  /** Un expediente que no se repite entre pruebas. */
  static String expedienteNuevo() {
    return "EXP-2026-" + expedientes.incrementAndGet();
  }

  /** Certificado de Trabajo válido, del Área de Administración. */
  static String trabajo(String expediente) {
    return """
        {"tipo": "CERTIFICADO_TRABAJO", "numeroExpediente": "%s", "nombres": "  Lucía ",
         "apellidos": "Paredes   Quinto", "dni": "45829364",
         "datos": {"cargo": "asistente administrativa", "fechaInicio": "2025-01-02",
                   "fechaFin": "2026-09-30"}}
        """
        .formatted(expediente);
  }

  static ResultActions enviar(MockMvc mvc, MockHttpSession sesion, String ruta, String cuerpo)
      throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }
}
