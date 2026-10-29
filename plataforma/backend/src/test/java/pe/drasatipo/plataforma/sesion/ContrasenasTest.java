package pe.drasatipo.plataforma.sesion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU04 (DRA-15): cambio de la contraseña propia y restablecimiento, con sesiones reales. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class ContrasenasTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  private String cuenta(String rol, boolean temporal) {
    String usuario = "clave" + secuencia.incrementAndGet();
    jdbc.update(
        """
        INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id,
                             debe_cambiar_contrasena)
        SELECT ?, ?, ?, id, ? FROM rol WHERE codigo = ?
        """,
        usuario,
        "Persona " + usuario,
        codificador.encode(CLAVE),
        temporal,
        rol);
    return usuario;
  }

  private long idDe(String usuario) {
    return jdbc.queryForObject(
        "SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, usuario);
  }

  private ResultActions ingresar(String usuario, String contrasena) throws Exception {
    return mvc.perform(
        post("/api/sesion")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"nombreUsuario\": \"%s\", \"contrasena\": \"%s\"}"
                    .formatted(usuario, contrasena)));
  }

  private MockHttpSession sesionDe(String usuario, String contrasena) throws Exception {
    return (MockHttpSession)
        ingresar(usuario, contrasena)
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession();
  }

  private ResultActions cambiar(MockHttpSession sesion, String actual, String nueva)
      throws Exception {
    return mvc.perform(
        put("/api/sesion/contrasena")
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"contrasenaActual\": \"%s\", \"contrasenaNueva\": \"%s\"}"
                    .formatted(actual, nueva)));
  }

  private ResultActions restablecer(MockHttpSession admin, long id, String temporal)
      throws Exception {
    return mvc.perform(
        post("/api/usuarios/%d/restablecer-contrasena".formatted(id))
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"contrasenaTemporal\": \"%s\"}".formatted(temporal)));
  }

  private String eventos(String usuario) {
    return jdbc.queryForObject(
        """
        SELECT string_agg(h.evento || coalesce(':' || h.detalle, ''), ',' ORDER BY h.id)
        FROM usuario_historial h JOIN usuario u ON u.id = h.usuario_id
        WHERE u.nombre_usuario = ?
        """,
        String.class,
        usuario);
  }

  @Test
  void conContrasenaTemporalSoloPuedeCambiarla() throws Exception {
    String usuario = cuenta("ADMINISTRADOR", true);
    MockHttpSession sesion = sesionDe(usuario, CLAVE);

    mvc.perform(get("/api/sesion").session(sesion))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.debeCambiarContrasena").value(true));
    // Aunque el rol tiene el permiso, el servidor rechaza todo lo demás.
    mvc.perform(get("/api/usuarios").session(sesion))
        .andExpect(status().isForbidden())
        .andExpect(
            jsonPath("$.mensaje").value("Debe cambiar su contraseña temporal antes de continuar."));

    cambiar(sesion, CLAVE, "Propia2026!")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.debeCambiarContrasena").value(false));
    mvc.perform(get("/api/usuarios").session(sesion)).andExpect(status().isOk());
    assertThat(eventos(usuario)).isEqualTo("CONTRASENA_CAMBIADA");
  }

  @Test
  void elCambioExigeLaContrasenaActual() throws Exception {
    String usuario = cuenta("DIRECTOR", false);
    MockHttpSession sesion = sesionDe(usuario, CLAVE);

    cambiar(sesion, "Incorrecta1", "Propia2026!")
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.contrasenaActual").value("La contraseña actual no es correcta."));
    cambiar(sesion, CLAVE, CLAVE)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.contrasenaNueva")
                .value("La contraseña nueva debe ser distinta de la actual."));
    cambiar(sesion, CLAVE, "corta")
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.contrasenaNueva")
                .value("La contraseña debe tener de 8 a 20 caracteres."));
    cambiar(sesion, "", "")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.contrasenaActual").value("Ingrese su contraseña actual."));
  }

  @Test
  void laContrasenaNuevaReemplazaALaAnterior() throws Exception {
    String usuario = cuenta("DIRECTOR", false);
    cambiar(sesionDe(usuario, CLAVE), CLAVE, "Propia2026!").andExpect(status().isOk());
    ingresar(usuario, CLAVE).andExpect(status().isUnauthorized());
    ingresar(usuario, "Propia2026!").andExpect(status().isOk());

    String hash =
        jdbc.queryForObject(
            "SELECT contrasena_hash FROM usuario WHERE nombre_usuario = ?", String.class, usuario);
    assertThat(hash).startsWith("{bcrypt}").doesNotContain("Propia2026!");
  }

  @Test
  void cambiarlaCierraLasDemasSesionesPeroNoLaActual() throws Exception {
    String usuario = cuenta("DIRECTOR", false);
    MockHttpSession equipoA = sesionDe(usuario, CLAVE);
    MockHttpSession equipoB = sesionDe(usuario, CLAVE);

    cambiar(equipoA, CLAVE, "Propia2026!").andExpect(status().isOk());

    mvc.perform(get("/api/sesion").session(equipoA)).andExpect(status().isOk());
    mvc.perform(get("/api/sesion").session(equipoB))
        .andExpect(status().isUnauthorized())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "Su contraseña se cambió en otra sesión. Inicie sesión con la contraseña nueva."));
  }

  @Test
  void elAdministradorRestableceDesbloqueaYCierraLasSesiones() throws Exception {
    MockHttpSession admin = sesionDe(cuenta("ADMINISTRADOR", false), CLAVE);
    String usuario = cuenta("AREA_ENCARGADA", false);
    MockHttpSession abierta = sesionDe(usuario, CLAVE);
    for (int i = 1; i <= 3; i++) {
      ingresar(usuario, "Mala0000" + i);
    }
    ingresar(usuario, CLAVE).andExpect(status().isLocked());

    String respuesta =
        restablecer(admin, idDe(usuario), "Temporal99")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.debeCambiarContrasena").value(true))
            .andExpect(jsonPath("$.bloqueadaHasta").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(respuesta).doesNotContain("Temporal99");

    // La sesión que estaba abierta se cierra con el motivo.
    mvc.perform(get("/api/sesion").session(abierta))
        .andExpect(status().isUnauthorized())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "El Administrador restableció su contraseña. Inicie sesión con la contraseña temporal."));

    // Desbloqueada: entra con la temporal y debe cambiarla.
    ingresar(usuario, CLAVE).andExpect(status().isUnauthorized());
    ingresar(usuario, "Temporal99")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.debeCambiarContrasena").value(true));
    assertThat(eventos(usuario))
        .isEqualTo(
            "BLOQUEADA:3 intentos fallidos seguidos; bloqueada hasta las "
                + eventos(usuario).split("las ")[1].split(",")[0]
                + ",CONTRASENA_RESTABLECIDA:La cuenta estaba bloqueada y quedó desbloqueada");
  }

  @Test
  void laListaMuestraHastaCuandoEstaBloqueada() throws Exception {
    MockHttpSession admin = sesionDe(cuenta("ADMINISTRADOR", false), CLAVE);
    String usuario = cuenta("DIRECTOR", false);
    for (int i = 1; i <= 3; i++) {
      ingresar(usuario, "Mala0000" + i);
    }
    mvc.perform(get("/api/usuarios").session(admin))
        .andExpect(
            jsonPath("$[?(@.nombreUsuario == '%s')].bloqueadaHasta".formatted(usuario))
                .isNotEmpty());
  }

  @Test
  void elAdministradorNoRestableceSuPropiaContrasena() throws Exception {
    String usuario = cuenta("ADMINISTRADOR", false);
    restablecer(sesionDe(usuario, CLAVE), idDe(usuario), "Temporal99")
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "Para su propia cuenta use \"Cambiar contraseña\", que pide la contraseña actual."));
  }

  @Test
  void validaLaContrasenaTemporal() throws Exception {
    MockHttpSession admin = sesionDe(cuenta("ADMINISTRADOR", false), CLAVE);
    restablecer(admin, idDe(cuenta("DIRECTOR", false)), "corta")
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.contrasenaTemporal")
                .value("La contraseña debe tener de 8 a 20 caracteres."));
    restablecer(admin, 999999, "Temporal99").andExpect(status().isNotFound());
  }

  @Test
  void soloElAdministradorRestablece() throws Exception {
    MockHttpSession director = sesionDe(cuenta("DIRECTOR", false), CLAVE);
    restablecer(director, idDe(cuenta("CONSULTA_INTERNA", false)), "Temporal99")
        .andExpect(status().isForbidden());
  }

  @Test
  void cambiarExigeSesion() throws Exception {
    mvc.perform(
            put("/api/sesion/contrasena")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasenaActual\": \"a\", \"contrasenaNueva\": \"b\"}"))
        .andExpect(status().isUnauthorized());
  }
}
