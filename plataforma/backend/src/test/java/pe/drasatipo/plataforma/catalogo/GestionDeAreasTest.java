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
import org.hamcrest.Matchers;
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

/** DRA-61: el Administrador crea, renombra, deshabilita y reactiva áreas. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class GestionDeAreasTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  @AfterEach
  void restaurarConfiguracion() {
    ConfiguracionInicial.restaurar(jdbc);
  }

  private String cuenta(String rol, String area) {
    String usuario = "gar" + secuencia.incrementAndGet();
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

  private MockHttpSession admin() throws Exception {
    return sesionDe(cuenta("ADMINISTRADOR", null));
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private static String json(String nombre) {
    return "{\"nombre\": \"%s\"}".formatted(nombre);
  }

  private ResultActions crear(MockHttpSession sesion, String nombre) throws Exception {
    return mvc.perform(
        post("/api/catalogo/areas")
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(nombre)));
  }

  /** Crea un área con un nombre único y devuelve su código. */
  private String areaNueva(MockHttpSession admin, String nombre) throws Exception {
    List<String> codigos =
        JsonPath.read(
            cuerpo(crear(admin, nombre).andExpect(status().isOk())),
            "$.areas[?(@.nombre == '%s')].codigo".formatted(nombre));
    return codigos.getFirst();
  }

  private ResultActions accion(MockHttpSession admin, String area, String accion) throws Exception {
    return mvc.perform(
        post("/api/catalogo/areas/%s/%s".formatted(area, accion)).with(csrf()).session(admin));
  }

  private List<String> areasDelFormularioDeCuentas(MockHttpSession admin) throws Exception {
    return JsonPath.read(
        cuerpo(mvc.perform(get("/api/areas").session(admin)).andExpect(status().isOk())),
        "$[*].codigo");
  }

  @Test
  void soloElAdministradorGestionaAreasYNoSePuedenEliminar() throws Exception {
    mvc.perform(
            post("/api/catalogo/areas")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Área sin sesión")))
        .andExpect(status().isUnauthorized());
    for (String[] rol :
        new String[][] {
          {"AREA_ENCARGADA", "CAPACITACION"}, {"DIRECTOR", null}, {"CONSULTA_INTERNA", null}
        }) {
      MockHttpSession otro = sesionDe(cuenta(rol[0], rol[1]));
      crear(otro, "Área de otro rol").andExpect(status().isForbidden());
      mvc.perform(
              put("/api/catalogo/areas/CAPACITACION")
                  .with(csrf())
                  .session(otro)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json("Otro nombre")))
          .andExpect(status().isForbidden());
      accion(otro, "ADMINISTRACION", "deshabilitar").andExpect(status().isForbidden());
      accion(otro, "ADMINISTRACION", "reactivar").andExpect(status().isForbidden());
    }
    MockHttpSession admin = admin();
    int estado =
        mvc.perform(delete("/api/catalogo/areas/CAPACITACION").with(csrf()).session(admin))
            .andReturn()
            .getResponse()
            .getStatus();
    assertThat(estado).isIn(404, 405);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM area WHERE codigo = 'CAPACITACION'", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void creaUnAreaActivaSinTiposQueApareceEnElFormularioDeCuentas() throws Exception {
    MockHttpSession admin = admin();
    String nombre = "Área de Extensión Rural " + secuencia.incrementAndGet();
    crear(admin, "  " + nombre.replace(" de ", "   de ") + " ")
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.nombre == '%s')].activa".formatted(nombre))
                .value(Matchers.contains(true)))
        .andExpect(
            jsonPath("$.areas[?(@.nombre == '%s')].tipos.length()".formatted(nombre))
                .value(Matchers.contains(0)))
        .andExpect(jsonPath("$.historial[0].evento").value("AREA_CREADA"))
        .andExpect(jsonPath("$.historial[0].detalle").value(nombre + ": se creó el área"));
    String codigo =
        jdbc.queryForObject("SELECT codigo FROM area WHERE nombre = ?", String.class, nombre);
    assertThat(codigo).startsWith("EXTENSION_RURAL_");
    assertThat(areasDelFormularioDeCuentas(admin)).contains(codigo);
  }

  @Test
  void elNombreEsObligatorioYUnicoSinMayusculasNiTildes() throws Exception {
    MockHttpSession admin = admin();
    for (String invalido : new String[] {"", "  ", "Ab", "x".repeat(101)}) {
      crear(admin, invalido)
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.mensaje").value(GestionCatalogo.NOMBRE_LONGITUD));
    }
    crear(admin, "area de capacitacion")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("Ya existe un área con ese nombre."));
    crear(admin, "ÁREA DE ADMINISTRACIÓN").andExpect(status().isConflict());
    // También contra un área deshabilitada.
    String nombre = "Área Temporal " + secuencia.incrementAndGet();
    String codigo = areaNueva(admin, nombre);
    accion(admin, codigo, "deshabilitar").andExpect(status().isOk());
    crear(admin, nombre.toLowerCase().replace("á", "a")).andExpect(status().isConflict());
  }

  @Test
  void elCodigoSaleDelNombreYNoSeRepite() {
    assertThat(GestionCatalogo.codigoDe("Área de Capacitación y Extensión"))
        .isEqualTo("CAPACITACION_Y_EXTENSION");
    assertThat(GestionCatalogo.codigoDe("Oficina de Planeamiento"))
        .isEqualTo("OFICINA_DE_PLANEAMIENTO");
    assertThat(GestionCatalogo.codigoDe("Área de la Mujer Rural")).isEqualTo("MUJER_RURAL");
    assertThat(GestionCatalogo.codigoDe("Área ñandú")).isEqualTo("NANDU");
    assertThat(GestionCatalogo.codigoDe("Área de " + "Desarrollo ".repeat(10)).length())
        .isLessThanOrEqualTo(26);
  }

  @Test
  void dosAreasConElMismoCodigoBaseReciben_2() throws Exception {
    MockHttpSession admin = admin();
    int n = secuencia.incrementAndGet();
    String primero = areaNueva(admin, "Área de Sanidad " + n + "!");
    String segundo = areaNueva(admin, "Área de Sanidad " + n + "?");
    assertThat(primero).isEqualTo("SANIDAD_" + n);
    assertThat(segundo).isEqualTo("SANIDAD_" + n + "_2");
  }

  @Test
  void renombrarCambiaElNombreEnTodaLaPlataformaPeroNoElCodigoNiElHistorialAnterior()
      throws Exception {
    MockHttpSession admin = admin();
    String emisor = cuenta("AREA_ENCARGADA", "CAPACITACION");
    mvc.perform(
            put("/api/catalogo/areas/CAPACITACION/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO")
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/catalogo/areas/CAPACITACION")
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Área de Capacitación y Extensión")))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.codigo == 'CAPACITACION')].nombre")
                .value(Matchers.contains("Área de Capacitación y Extensión")))
        .andExpect(jsonPath("$.historial[0].evento").value("AREA_RENOMBRADA"))
        .andExpect(jsonPath("$.historial[0].area").value("Área de Capacitación y Extensión"))
        .andExpect(
            jsonPath("$.historial[0].detalle")
                .value("Nombre: Área de Capacitación → Área de Capacitación y Extensión"))
        .andExpect(
            jsonPath("$.historial[1].detalle")
                .value("Área de Capacitación: se asignó Constancia de Productor Activo"));
    // La sesión de quien ya estaba conectado muestra el nombre nuevo.
    mvc.perform(get("/api/sesion").session(sesionDe(emisor)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.areaNombre").value("Área de Capacitación y Extensión"));
    // Solo cambian mayúsculas o tildes de su propio nombre: se permite.
    mvc.perform(
            put("/api/catalogo/areas/CAPACITACION")
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Área de capacitación y extensión")))
        .andExpect(status().isOk());
  }

  @Test
  void renombrarValidaElNombre() throws Exception {
    MockHttpSession admin = admin();
    String ruta = "/api/catalogo/areas/CAPACITACION";
    mvc.perform(
            put(ruta)
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Área de Capacitación")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.mensaje").value("El nombre nuevo es igual al actual."));
    mvc.perform(
            put(ruta)
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("area de administracion")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("Ya existe un área con ese nombre."));
    mvc.perform(
            put(ruta)
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("No")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            put("/api/catalogo/areas/NO_EXISTE")
                .with(csrf())
                .session(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("Área nueva")))
        .andExpect(status().isNotFound());
  }

  @Test
  void noSeDeshabilitaUnAreaConPersonasActivas() throws Exception {
    MockHttpSession admin = admin();
    String codigo = areaNueva(admin, "Área con Personas " + secuencia.incrementAndGet());
    String primera = cuenta("AREA_ENCARGADA", codigo);
    cuenta("AREA_ENCARGADA", codigo);
    Integer cambios = jdbc.queryForObject("SELECT count(*) FROM catalogo_historial", Integer.class);
    accion(admin, codigo, "deshabilitar")
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "No se puede deshabilitar: el área tiene 2 personas activas."
                        + " Muévalas a otra área desde Usuarios."));
    jdbc.update("UPDATE usuario SET activo = false WHERE nombre_usuario = ?", primera);
    accion(admin, codigo, "deshabilitar")
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "No se puede deshabilitar: el área tiene 1 persona activa."
                        + " Muévalas a otra área desde Usuarios."));
    assertThat(
            jdbc.queryForObject("SELECT activa FROM area WHERE codigo = ?", Boolean.class, codigo))
        .isTrue();
    assertThat(jdbc.queryForObject("SELECT count(*) FROM catalogo_historial", Integer.class))
        .isEqualTo(cambios);
  }

  @Test
  void deshabilitarYReactivarConservaLosTiposYQuedaEnElHistorial() throws Exception {
    MockHttpSession admin = admin();
    String nombre = "Área de Pruebas " + secuencia.incrementAndGet();
    String codigo = areaNueva(admin, nombre);
    mvc.perform(
            put("/api/catalogo/areas/%s/tipos-documento/CERTIFICADO_TRABAJO".formatted(codigo))
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk());
    String emisor = cuenta("AREA_ENCARGADA", codigo);
    MockHttpSession sesionEmisor = sesionDe(emisor);
    Long id =
        jdbc.queryForObject("SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, emisor);
    mvc.perform(post("/api/usuarios/%d/desactivar".formatted(id)).with(csrf()).session(admin))
        .andExpect(status().isOk());

    accion(admin, codigo, "deshabilitar")
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.codigo == '%s')].activa".formatted(codigo))
                .value(Matchers.contains(false)))
        .andExpect(
            jsonPath("$.areas[?(@.codigo == '%s')].tipos[*].codigo".formatted(codigo))
                .value(Matchers.contains("CERTIFICADO_TRABAJO")))
        .andExpect(jsonPath("$.historial[0].evento").value("AREA_DESHABILITADA"))
        .andExpect(jsonPath("$.historial[0].detalle").value(nombre + ": se deshabilitó"));
    assertThat(areasDelFormularioDeCuentas(admin)).doesNotContain(codigo);
    accion(admin, codigo, "deshabilitar")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("«%s» ya está deshabilitada.".formatted(nombre)));
    // Una cuenta del área deshabilitada no se reactiva sin moverla antes a otra área.
    mvc.perform(post("/api/usuarios/%d/reactivar".formatted(id)).with(csrf()).session(admin))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    ("El área «%s» está deshabilitada. Edite la cuenta y asígnele otra área antes de"
                            + " reactivarla.")
                        .formatted(nombre)));
    // Tampoco se asignan tipos ni se crean cuentas en ella.
    mvc.perform(
            put("/api/catalogo/areas/%s/tipos-documento/CERTIFICADO_PRACTICAS".formatted(codigo))
                .with(csrf())
                .session(admin))
        .andExpect(status().isNotFound());

    accion(admin, codigo, "reactivar")
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.areas[?(@.codigo == '%s')].activa".formatted(codigo))
                .value(Matchers.contains(true)))
        .andExpect(jsonPath("$.historial[0].evento").value("AREA_REACTIVADA"))
        .andExpect(jsonPath("$.historial[0].detalle").value(nombre + ": se reactivó"));
    accion(admin, codigo, "reactivar")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("«%s» ya está activa.".formatted(nombre)));
    mvc.perform(post("/api/usuarios/%d/reactivar".formatted(id)).with(csrf()).session(admin))
        .andExpect(status().isOk());
    MockHttpSession deNuevo = sesionDe(emisor);
    List<String> tipos =
        JsonPath.read(
            cuerpo(mvc.perform(get("/api/tipos-documento").session(deNuevo))), "$[*].codigo");
    assertThat(tipos).containsExactly("CERTIFICADO_TRABAJO");
    assertThat(sesionEmisor).isNotNull();
  }

  @Test
  void unEmisorDeUnAreaDeshabilitadaNoRegistraDocumentos() throws Exception {
    MockHttpSession admin = admin();
    String codigo = areaNueva(admin, "Área Cerrada " + secuencia.incrementAndGet());
    mvc.perform(
            put("/api/catalogo/areas/%s/tipos-documento/CERTIFICADO_TRABAJO".formatted(codigo))
                .with(csrf())
                .session(admin))
        .andExpect(status().isOk());
    String emisor = cuenta("AREA_ENCARGADA", codigo);
    MockHttpSession sesion = sesionDe(emisor);
    // Se fuerza el caso, que la pantalla no permite: una persona activa en un área deshabilitada.
    jdbc.update("UPDATE area SET activa = false WHERE codigo = ?", codigo);
    mvc.perform(get("/api/tipos-documento").session(sesion))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
    mvc.perform(get("/api/tipos-documento/CERTIFICADO_TRABAJO").session(sesion))
        .andExpect(status().isForbidden());
  }
}
