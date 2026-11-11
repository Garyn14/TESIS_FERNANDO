package pe.drasatipo.plataforma.catalogo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** DRA-60: el Administrador configura qué tipos de documento emite cada área. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class ConfiguracionDeAreasTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();
  private static final String RUTA = "/api/catalogo/areas/%s/tipos-documento/%s";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  /** Deja la configuración inicial (V3), para no afectar a las demás pruebas. */
  @AfterEach
  void restaurarConfiguracion() {
    ConfiguracionInicial.restaurar(jdbc);
  }

  private String cuenta(String rol, String area) {
    String usuario = "cat" + secuencia.incrementAndGet();
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
    return usuario;
  }

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return (MockHttpSession)
        mvc.perform(
                post("/api/sesion")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"nombreUsuario\": \"%s\", \"contrasena\": \"%s\"}"
                            .formatted(cuenta(rol, area), CLAVE)))
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession();
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private List<String> tiposQuePuedeRegistrar(MockHttpSession emisor) throws Exception {
    return JsonPath.read(
        cuerpo(mvc.perform(get("/api/tipos-documento").session(emisor)).andExpect(status().isOk())),
        "$[*].codigo");
  }

  @Test
  void soloElAdministradorConfiguraLasAreas() throws Exception {
    mvc.perform(get("/api/catalogo")).andExpect(status().isUnauthorized());
    for (String[] rol :
        new String[][] {
          {"AREA_ENCARGADA", "CAPACITACION"}, {"DIRECTOR", null}, {"CONSULTA_INTERNA", null}
        }) {
      MockHttpSession otro = sesion(rol[0], rol[1]);
      mvc.perform(get("/api/catalogo").session(otro)).andExpect(status().isForbidden());
      mvc.perform(
              put(RUTA.formatted("CAPACITACION", "CERTIFICADO_TRABAJO")).with(csrf()).session(otro))
          .andExpect(status().isForbidden());
    }
  }

  @Test
  void muestraLasAreasConSusTiposYLosTiposQueSePuedenAsignar() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    mvc.perform(get("/api/catalogo").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tipos.length()").value(5))
        .andExpect(
            jsonPath("$.areas[?(@.codigo == 'CAPACITACION')].tipos[*].codigo")
                .value(
                    org.hamcrest.Matchers.containsInAnyOrder(
                        "CERTIFICADO_CAPACITACION", "CERTIFICADO_RECONOCIMIENTO")))
        .andExpect(
            jsonPath("$.areas[?(@.codigo == 'DESARROLLO_AGRARIO')].tipos[*].codigo")
                .value(org.hamcrest.Matchers.contains("CONSTANCIA_PRODUCTOR_ACTIVO")));
  }

  @Test
  void cuentaLasPersonasActivasDelArea() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    String ruta = "$.areas[?(@.codigo == 'DESARROLLO_AGRARIO')].personasActivas";
    List<Integer> antes =
        JsonPath.read(cuerpo(mvc.perform(get("/api/catalogo").session(admin))), ruta);
    cuenta("AREA_ENCARGADA", "DESARROLLO_AGRARIO");
    String inactiva = cuenta("AREA_ENCARGADA", "DESARROLLO_AGRARIO");
    jdbc.update("UPDATE usuario SET activo = false WHERE nombre_usuario = ?", inactiva);
    cuenta("DIRECTOR", null);
    List<Integer> despues =
        JsonPath.read(cuerpo(mvc.perform(get("/api/catalogo").session(admin))), ruta);
    assertThat(despues.getFirst()).isEqualTo(antes.getFirst() + 1);
  }

  @Test
  void asignarYQuitarRigeDesdeLaSiguientePantallaYQuedaEnElHistorial() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    MockHttpSession rosa = sesion("AREA_ENCARGADA", "CAPACITACION");
    assertThat(tiposQuePuedeRegistrar(rosa)).doesNotContain("CONSTANCIA_PRODUCTOR_ACTIVO");

    mvc.perform(
            put(RUTA.formatted("CAPACITACION", "CONSTANCIA_PRODUCTOR_ACTIVO"))
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.codigo == 'CAPACITACION')].tipos[*].codigo")
                .value(org.hamcrest.Matchers.hasItem("CONSTANCIA_PRODUCTOR_ACTIVO")))
        .andExpect(jsonPath("$.historial[0].evento").value("TIPO_ASIGNADO"))
        .andExpect(
            jsonPath("$.historial[0].detalle")
                .value("Área de Capacitación: se asignó Constancia de Productor Activo"))
        .andExpect(jsonPath("$.historial[0].realizadoPor").isNotEmpty());
    // Un mismo tipo puede estar en dos áreas, y la sesión abierta de Rosa ya lo ve.
    assertThat(tiposQuePuedeRegistrar(rosa)).contains("CONSTANCIA_PRODUCTOR_ACTIVO");
    mvc.perform(get("/api/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO").session(rosa))
        .andExpect(status().isOk());

    mvc.perform(
            delete(RUTA.formatted("CAPACITACION", "CERTIFICADO_RECONOCIMIENTO"))
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.historial[0].evento").value("TIPO_QUITADO"))
        .andExpect(
            jsonPath("$.historial[0].detalle")
                .value("Área de Capacitación: se quitó Certificado de Reconocimiento"));
    assertThat(tiposQuePuedeRegistrar(rosa)).doesNotContain("CERTIFICADO_RECONOCIMIENTO");
    mvc.perform(get("/api/tipos-documento/CERTIFICADO_RECONOCIMIENTO").session(rosa))
        .andExpect(status().isForbidden());
  }

  @Test
  void asignarLoYaAsignadoOQuitarLoQueNoEstaNoCambiaNada() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    Integer cambios = jdbc.queryForObject("SELECT count(*) FROM catalogo_historial", Integer.class);
    mvc.perform(
            put(RUTA.formatted("CAPACITACION", "CERTIFICADO_CAPACITACION"))
                .with(csrf())
                .session(admin))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value("«Área de Capacitación» ya tenía asignado «Certificado de Capacitación»."));
    mvc.perform(
            delete(RUTA.formatted("CAPACITACION", "CERTIFICADO_TRABAJO"))
                .with(csrf())
                .session(admin))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value("«Área de Capacitación» no tiene asignado «Certificado de Trabajo»."));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM catalogo_historial", Integer.class))
        .isEqualTo(cambios);
  }

  @Test
  void unAreaOUnTipoInexistenteSeInforma() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    mvc.perform(put(RUTA.formatted("NO_EXISTE", "CERTIFICADO_TRABAJO")).with(csrf()).session(admin))
        .andExpect(status().isNotFound())
        .andExpect(
            jsonPath("$.mensaje").value("No existe un área activa con el código NO_EXISTE."));
    mvc.perform(put(RUTA.formatted("CAPACITACION", "NO_EXISTE")).with(csrf()).session(admin))
        .andExpect(status().isNotFound())
        .andExpect(
            jsonPath("$.mensaje")
                .value("No existe un tipo de documento activo con el código NO_EXISTE."));
  }

  @Test
  void unAreaPuedeQuedarseSinTipos() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    MockHttpSession marco = sesion("AREA_ENCARGADA", "DESARROLLO_AGRARIO");
    mvc.perform(
            delete(RUTA.formatted("DESARROLLO_AGRARIO", "CONSTANCIA_PRODUCTOR_ACTIVO"))
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.codigo == 'DESARROLLO_AGRARIO')].tipos.length()")
                .value(org.hamcrest.Matchers.contains(0)));
    assertThat(tiposQuePuedeRegistrar(marco)).isEmpty();
  }
}
