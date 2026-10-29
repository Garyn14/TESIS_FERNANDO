package pe.drasatipo.plataforma.sesion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/**
 * HU03: protección CSRF como la usa el navegador, sin el ayudante csrf() de spring-security-test.
 * Ese ayudante reemplaza el repositorio de tokens del filtro CSRF para todo el contexto, por eso
 * esta prueba usa un contexto propio (propiedad prueba.contexto).
 */
@SpringBootTest(properties = "prueba.contexto=csrf")
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class CsrfSesionTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  /** Valor de XSRF-TOKEN en la cabecera Set-Cookie, como lo lee el navegador. */
  private static String tokenCsrf(MockHttpServletResponse respuesta) {
    return respuesta.getHeaders("Set-Cookie").stream()
        .filter(c -> c.startsWith("XSRF-TOKEN="))
        .map(c -> c.substring("XSRF-TOKEN=".length(), c.indexOf(';')))
        .filter(v -> !v.isEmpty())
        .findFirst()
        .orElse(null);
  }

  @Test
  void flujoCsrfDelNavegador() throws Exception {
    jdbc.update(
        """
        INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id)
        SELECT 'csrf.prueba', 'Prueba CSRF', ?, id FROM rol WHERE codigo = 'DIRECTOR'
        """,
        codificador.encode("Clave2026!"));

    // 1. La primera respuesta, aunque sea 401, ya trae el token en una cookie legible por JS.
    var primera = mvc.perform(get("/api/sesion")).andReturn().getResponse();
    String inicial = tokenCsrf(primera);
    assertThat(inicial).isNotBlank();
    assertThat(primera.getHeaders("Set-Cookie").toString()).doesNotContain("HttpOnly");

    String cuerpo = "{\"nombreUsuario\": \"csrf.prueba\", \"contrasena\": \"Clave2026!\"}";

    // 2. Sin la cabecera X-XSRF-TOKEN se rechaza.
    mvc.perform(
            post("/api/sesion")
                .cookie(new Cookie("XSRF-TOKEN", inicial))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo))
        .andExpect(status().isForbidden());

    // 3. Con la cabecera se acepta, y la sesión nueva recibe un token nuevo.
    var ingreso =
        mvc.perform(
                post("/api/sesion")
                    .cookie(new Cookie("XSRF-TOKEN", inicial))
                    .header("X-XSRF-TOKEN", inicial)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(cuerpo))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    assertThat(tokenCsrf(ingreso)).isNotBlank().isNotEqualTo(inicial);
  }
}
