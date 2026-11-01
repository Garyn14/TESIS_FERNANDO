package pe.drasatipo.plataforma.areas;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU07 (DRA-18): selección del tipo de documento, limitada al área por la regla de RF05. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class SeleccionDeTipoDeDocumentoTest {

  private static final String CLAVE = "Clave2026!";
  private static final String NO_ASIGNADO = "Este tipo de documento no está asignado a su área.";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  /** Inicia sesión con una cuenta nueva, con contraseña propia, creada directamente en la base. */
  private MockHttpSession sesion(String rol, String area) throws Exception {
    String usuario = "tipo" + secuencia.incrementAndGet();
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

  @Test
  void laListaIncluyeLaDescripcionYElOrigenDeCadaTipo() throws Exception {
    mvc.perform(get("/api/tipos-documento").session(sesion("AREA_ENCARGADA", "CAPACITACION")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(
            jsonPath("$[?(@.codigo == 'CERTIFICADO_CAPACITACION')].descripcion")
                .value("Para participantes de talleres y capacitaciones."))
        .andExpect(
            jsonPath("$[*].origen")
                .value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("OFICIO"))));
  }

  @Test
  void abreUnTipoDeOficioDeSuArea() throws Exception {
    mvc.perform(
            get("/api/tipos-documento/CERTIFICADO_CAPACITACION")
                .session(sesion("AREA_ENCARGADA", "CAPACITACION")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nombre").value("Certificado de Capacitación"))
        .andExpect(jsonPath("$.origen").value("OFICIO"));
  }

  @Test
  void abreUnTipoASolicitudDeParteDeSuArea() throws Exception {
    mvc.perform(
            get("/api/tipos-documento/CERTIFICADO_TRABAJO")
                .session(sesion("AREA_ENCARGADA", "ADMINISTRACION")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.origen").value("SOLICITUD_PARTE"))
        .andExpect(jsonPath("$.titulo").value("CERTIFICADO"));
  }

  @Test
  void unTipoDeOtraAreaNoSeAbreAunqueSeLlameALaApi() throws Exception {
    mvc.perform(
            get("/api/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO")
                .session(sesion("AREA_ENCARGADA", "CAPACITACION")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value(NO_ASIGNADO));
  }

  @Test
  void unTipoInexistenteOInactivoDaLaMismaRespuesta() throws Exception {
    MockHttpSession capacitacion = sesion("AREA_ENCARGADA", "CAPACITACION");
    mvc.perform(get("/api/tipos-documento/NO_EXISTE").session(capacitacion))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value(NO_ASIGNADO));

    jdbc.update(
        "UPDATE tipo_documento SET activo = FALSE WHERE codigo = 'CERTIFICADO_RECONOCIMIENTO'");
    try {
      mvc.perform(get("/api/tipos-documento/CERTIFICADO_RECONOCIMIENTO").session(capacitacion))
          .andExpect(status().isForbidden())
          .andExpect(jsonPath("$.mensaje").value(NO_ASIGNADO));
      mvc.perform(get("/api/tipos-documento").session(capacitacion))
          .andExpect(jsonPath("$.length()").value(1));
    } finally {
      jdbc.update(
          "UPDATE tipo_documento SET activo = TRUE WHERE codigo = 'CERTIFICADO_RECONOCIMIENTO'");
    }
  }

  @Test
  void sinAreaAsignadaNoAbreNingunTipo() throws Exception {
    mvc.perform(
            get("/api/tipos-documento/CERTIFICADO_CAPACITACION")
                .session(sesion("AREA_ENCARGADA", null)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value(NO_ASIGNADO));
  }

  @Test
  void permisosDeLaRuta() throws Exception {
    String ruta = "/api/tipos-documento/CERTIFICADO_CAPACITACION";
    mvc.perform(get(ruta)).andExpect(status().isUnauthorized());
    for (String rol : new String[] {"ADMINISTRADOR", "DIRECTOR", "CONSULTA_INTERNA"}) {
      mvc.perform(get(ruta).session(sesion(rol, null))).andExpect(status().isForbidden());
    }
  }
}
