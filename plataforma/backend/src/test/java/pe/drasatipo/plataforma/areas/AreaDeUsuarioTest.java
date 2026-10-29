package pe.drasatipo.plataforma.areas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
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

/** HU05 (DRA-16): área de los usuarios del Área encargada y regla de RF05, con sesiones reales. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class AreaDeUsuarioTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  MockHttpSession admin;

  /** Cuenta con contraseña propia (no temporal), creada directamente en la base. */
  private String cuenta(String rol, String area) {
    String usuario = "area" + secuencia.incrementAndGet();
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

  private MockHttpSession sesionDe(String usuario) throws Exception {
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

  private ResultActions crear(String usuario, String rol, String area) throws Exception {
    return mvc.perform(
        post("/api/usuarios")
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"nombreUsuario": "%s", "nombreCompleto": "Persona %s", "rol": "%s", "area": %s,
                 "contrasenaTemporal": "Temporal99"}
                """
                    .formatted(usuario, usuario, rol, area == null ? "null" : "\"" + area + "\"")));
  }

  private ResultActions editar(long id, String rol, String area) throws Exception {
    return mvc.perform(
        put("/api/usuarios/" + id)
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"nombreCompleto\": \"Persona editada\", \"rol\": \"%s\", \"area\": %s}"
                    .formatted(rol, area == null ? "null" : "\"" + area + "\"")));
  }

  private long idCreado(ResultActions resultado) throws Exception {
    return ((Number)
            JsonPath.read(resultado.andReturn().getResponse().getContentAsString(), "$.id"))
        .longValue();
  }

  private String ultimoEvento(long id) {
    return jdbc.queryForObject(
        "SELECT detalle FROM usuario_historial WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
        String.class,
        id);
  }

  @BeforeEach
  void iniciarSesionComoAdministrador() throws Exception {
    admin = sesionDe(cuenta("ADMINISTRADOR", null));
  }

  @Test
  void elAreaEsObligatoriaParaElAreaEncargada() throws Exception {
    crear("sinarea" + secuencia.incrementAndGet(), "AREA_ENCARGADA", null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.area").value("Seleccione el área de la persona."));
    crear("malarea" + secuencia.incrementAndGet(), "AREA_ENCARGADA", "NO_EXISTE")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.area").value("Seleccione un área válida."));
  }

  @Test
  void creaLaCuentaConSuAreaYLaRegistraEnElHistorial() throws Exception {
    var resultado =
        crear("conarea" + secuencia.incrementAndGet(), "AREA_ENCARGADA", "CAPACITACION")
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.area").value("CAPACITACION"))
            .andExpect(jsonPath("$.areaNombre").value("Área de Capacitación"));
    assertThat(ultimoEvento(idCreado(resultado)))
        .isEqualTo("Rol: Área encargada; Área: Área de Capacitación");
  }

  @Test
  void losDemasRolesNoTienenArea() throws Exception {
    crear("director" + secuencia.incrementAndGet(), "DIRECTOR", "CAPACITACION")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.area").doesNotExist());
  }

  @Test
  void cambiarElAreaQuedaEnElHistorial() throws Exception {
    long id =
        idCreado(crear("cambia" + secuencia.incrementAndGet(), "AREA_ENCARGADA", "CAPACITACION"));
    editar(id, "AREA_ENCARGADA", "ADMINISTRACION")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.areaNombre").value("Área de Administración"));
    assertThat(ultimoEvento(id)).contains("Área: Área de Capacitación → Área de Administración");
  }

  @Test
  void alDejarElAreaEncargadaSeQuitaElArea() throws Exception {
    long id =
        idCreado(crear("deja" + secuencia.incrementAndGet(), "AREA_ENCARGADA", "CAPACITACION"));
    editar(id, "CONSULTA_INTERNA", "CAPACITACION")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.area").doesNotExist());
    assertThat(ultimoEvento(id)).contains("Área: Área de Capacitación → sin área");
  }

  @Test
  void editarUnaCuentaAntiguaSinAreaExigeAsignarla() throws Exception {
    String antigua = cuenta("AREA_ENCARGADA", null);
    long id =
        jdbc.queryForObject("SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, antigua);
    editar(id, "AREA_ENCARGADA", null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.area").value("Seleccione el área de la persona."));
  }

  @Test
  void listaLasAreasActivasConSusTiposDeDocumento() throws Exception {
    mvc.perform(get("/api/areas").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(
            jsonPath("$[?(@.codigo == 'CAPACITACION')].tipos[*].nombre")
                .value(
                    org.hamcrest.Matchers.containsInAnyOrder(
                        "Certificado de Capacitación", "Certificado de Reconocimiento")));
  }

  @Test
  void elAreaEncargadaSoloVeLosTiposDeSuArea() throws Exception {
    MockHttpSession capacitacion = sesionDe(cuenta("AREA_ENCARGADA", "CAPACITACION"));
    mvc.perform(get("/api/tipos-documento").session(capacitacion))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$[*].codigo")
                .value(
                    org.hamcrest.Matchers.containsInAnyOrder(
                        "CERTIFICADO_CAPACITACION", "CERTIFICADO_RECONOCIMIENTO")));

    MockHttpSession agrario = sesionDe(cuenta("AREA_ENCARGADA", "DESARROLLO_AGRARIO"));
    mvc.perform(get("/api/tipos-documento").session(agrario))
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].codigo").value("CONSTANCIA_PRODUCTOR_ACTIVO"));
  }

  @Test
  void sinAreaAsignadaNoVeNingunTipo() throws Exception {
    MockHttpSession sinArea = sesionDe(cuenta("AREA_ENCARGADA", null));
    mvc.perform(get("/api/tipos-documento").session(sinArea))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void laSesionIncluyeElAreaYElCambioRigeEnLaSiguienteSolicitud() throws Exception {
    String usuario = cuenta("AREA_ENCARGADA", "CAPACITACION");
    MockHttpSession sesion = sesionDe(usuario);
    mvc.perform(get("/api/sesion").session(sesion))
        .andExpect(jsonPath("$.areaNombre").value("Área de Capacitación"));

    long id =
        jdbc.queryForObject("SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, usuario);
    editar(id, "AREA_ENCARGADA", "DESARROLLO_AGRARIO").andExpect(status().isOk());

    mvc.perform(get("/api/sesion").session(sesion))
        .andExpect(jsonPath("$.areaNombre").value("Área de Desarrollo Agrario"));
    mvc.perform(get("/api/tipos-documento").session(sesion))
        .andExpect(jsonPath("$[0].codigo").value("CONSTANCIA_PRODUCTOR_ACTIVO"));
  }

  @Test
  void permisosDeLasRutas() throws Exception {
    MockHttpSession director = sesionDe(cuenta("DIRECTOR", null));
    mvc.perform(get("/api/areas").session(director)).andExpect(status().isForbidden());
    mvc.perform(get("/api/tipos-documento").session(director)).andExpect(status().isForbidden());
    mvc.perform(get("/api/areas")).andExpect(status().isUnauthorized());
  }
}
