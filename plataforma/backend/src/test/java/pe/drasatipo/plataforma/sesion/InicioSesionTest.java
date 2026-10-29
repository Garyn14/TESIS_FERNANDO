package pe.drasatipo.plataforma.sesion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

/**
 * HU03 (DRA-14): inicio de sesión real, sin sesiones simuladas. No es transaccional: cada inicio de
 * sesión guarda sus intentos en su propia transacción, igual que en producción.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class InicioSesionTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  @Value("${server.servlet.session.timeout}")
  Duration inactividad;

  /** Crea una cuenta con nombre único y devuelve su nombre de usuario. */
  private String cuenta(String rol, boolean activa) {
    String usuario = "sesion" + secuencia.incrementAndGet();
    jdbc.update(
        """
        INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id, activo)
        SELECT ?, ?, ?, id, ? FROM rol WHERE codigo = ?
        """,
        usuario,
        "Persona " + usuario,
        codificador.encode(CLAVE),
        activa,
        rol);
    return usuario;
  }

  private ResultActions ingresar(String usuario, String contrasena, MockHttpSession sesion)
      throws Exception {
    var solicitud =
        post("/api/sesion")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"nombreUsuario\": \"%s\", \"contrasena\": \"%s\"}"
                    .formatted(usuario, contrasena));
    if (sesion != null) {
      solicitud.session(sesion);
    }
    return mvc.perform(solicitud);
  }

  private ResultActions ingresar(String usuario, String contrasena) throws Exception {
    return ingresar(usuario, contrasena, null);
  }

  private MockHttpSession sesionDe(String usuario) throws Exception {
    return (MockHttpSession)
        ingresar(usuario, CLAVE).andExpect(status().isOk()).andReturn().getRequest().getSession();
  }

  private String evento(String usuario) {
    return jdbc.queryForObject(
        """
        SELECT string_agg(h.evento, ',' ORDER BY h.id) FROM usuario_historial h
        JOIN usuario u ON u.id = h.usuario_id WHERE u.nombre_usuario = ?
        """,
        String.class,
        usuario);
  }

  @Test
  void iniciaSesionYDevuelveElRolYLosPermisosDeLaBaseDeDatos() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    ingresar(usuario, CLAVE)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nombreUsuario").value(usuario))
        .andExpect(jsonPath("$.rol").value("DIRECTOR"))
        .andExpect(jsonPath("$.rolNombre").value("Director"))
        .andExpect(jsonPath("$.permisos.length()").value(8))
        .andExpect(jsonPath("$.permisos[?(@ == 'DOCUMENTO_FIRMAR')]").exists())
        .andExpect(jsonPath("$.permisos[?(@ == 'USUARIOS_GESTIONAR')]").doesNotExist());
  }

  @Test
  void laSesionDaAccesoSoloALoQuePermiteElRol() throws Exception {
    MockHttpSession admin = sesionDe(cuenta("ADMINISTRADOR", true));
    mvc.perform(get("/api/sesion").session(admin)).andExpect(status().isOk());
    mvc.perform(get("/api/usuarios").session(admin)).andExpect(status().isOk());

    MockHttpSession consulta = sesionDe(cuenta("CONSULTA_INTERNA", true));
    mvc.perform(get("/api/usuarios").session(consulta))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value("No tiene permiso para realizar esta acción."));
  }

  @Test
  void elUsuarioNoDistingueMayusculas() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    ingresar(usuario.toUpperCase(), CLAVE)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nombreUsuario").value(usuario));
  }

  @Test
  void usuarioInexistenteYContrasenaIncorrectaDanElMismoMensaje() throws Exception {
    ingresar("noexiste", CLAVE)
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.mensaje").value("Usuario o contraseña incorrectos."));
    ingresar(cuenta("DIRECTOR", true), "Incorrecta1")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.mensaje").value("Usuario o contraseña incorrectos."));
  }

  @Test
  void tresIntentosFallidosBloqueanLaCuentaUnaHora() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    ingresar(usuario, "Mala00001").andExpect(status().isUnauthorized());
    ingresar(usuario, "Mala00002").andExpect(status().isUnauthorized());
    ingresar(usuario, "Mala00003")
        .andExpect(status().isLocked())
        .andExpect(
            jsonPath("$.mensaje").value(containsString("bloqueada por 3 intentos fallidos")));

    // Bloqueada: ni la contraseña correcta entra.
    ingresar(usuario, CLAVE).andExpect(status().isLocked());

    var bloqueo =
        jdbc.queryForMap(
            """
            SELECT bloqueada_hasta - now() AS restante, intentos_fallidos FROM usuario
            WHERE nombre_usuario = ?
            """,
            usuario);
    var restante = (org.postgresql.util.PGInterval) bloqueo.get("restante");
    assertThat(restante.getHours() * 60 + restante.getMinutes()).isBetween(58, 60);
    assertThat(((Number) bloqueo.get("intentos_fallidos")).intValue()).isZero();
    assertThat(evento(usuario)).isEqualTo("BLOQUEADA");
  }

  @Test
  void pasadaLaHoraPuedeIngresarDeNuevo() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    for (int i = 0; i < 3; i++) {
      ingresar(usuario, "Mala0000" + i);
    }
    jdbc.update(
        "UPDATE usuario SET bloqueada_hasta = now() - interval '1 second' WHERE nombre_usuario = ?",
        usuario);
    ingresar(usuario, CLAVE).andExpect(status().isOk());
  }

  @Test
  void unIngresoCorrectoReiniciaElContador() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    ingresar(usuario, "Mala00001").andExpect(status().isUnauthorized());
    ingresar(usuario, "Mala00002").andExpect(status().isUnauthorized());
    ingresar(usuario, CLAVE).andExpect(status().isOk());
    ingresar(usuario, "Mala00003").andExpect(status().isUnauthorized());
    ingresar(usuario, "Mala00004").andExpect(status().isUnauthorized());
  }

  @Test
  void unaCuentaDesactivadaNoPuedeIniciarSesion() throws Exception {
    String usuario = cuenta("AREA_ENCARGADA", false);
    ingresar(usuario, CLAVE)
        .andExpect(status().isForbidden())
        .andExpect(
            jsonPath("$.mensaje")
                .value("Su cuenta está desactivada. Comuníquese con el Administrador."));
    // Con la contraseña incorrecta no se revela que está desactivada.
    ingresar(usuario, "Mala00001")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.mensaje").value("Usuario o contraseña incorrectos."));
  }

  @Test
  void desactivarLaCuentaCierraSuSesionAbierta() throws Exception {
    String usuario = cuenta("CONSULTA_INTERNA", true);
    MockHttpSession sesion = sesionDe(usuario);
    jdbc.update("UPDATE usuario SET activo = false WHERE nombre_usuario = ?", usuario);

    mvc.perform(get("/api/sesion").session(sesion))
        .andExpect(status().isUnauthorized())
        .andExpect(
            jsonPath("$.mensaje")
                .value("Su cuenta fue desactivada. Comuníquese con el Administrador."));
    assertThat(sesion.isInvalid()).isTrue();
  }

  @Test
  void cambiarElRolCambiaLosPermisosDesdeLaSiguienteSolicitud() throws Exception {
    String usuario = cuenta("DIRECTOR", true);
    MockHttpSession sesion = sesionDe(usuario);
    mvc.perform(get("/api/usuarios").session(sesion)).andExpect(status().isForbidden());

    jdbc.update(
        """
        UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR')
        WHERE nombre_usuario = ?
        """,
        usuario);
    mvc.perform(get("/api/usuarios").session(sesion)).andExpect(status().isOk());
    mvc.perform(get("/api/sesion").session(sesion))
        .andExpect(jsonPath("$.rol").value("ADMINISTRADOR"));
  }

  @Test
  void cerrarSesionLaTerminaEnElServidor() throws Exception {
    MockHttpSession sesion = sesionDe(cuenta("DIRECTOR", true));
    mvc.perform(delete("/api/sesion").with(csrf()).session(sesion))
        .andExpect(status().isNoContent());
    assertThat(sesion.isInvalid()).isTrue();
  }

  @Test
  void elIdentificadorDeSesionCambiaAlIniciarSesion() throws Exception {
    MockHttpSession previa = new MockHttpSession();
    String idPrevio = previa.getId();
    ingresar(cuenta("DIRECTOR", true), CLAVE, previa).andExpect(status().isOk());
    assertThat(previa.getId()).isNotEqualTo(idPrevio);
  }

  @Test
  void sinTokenCsrfNoSeAceptaElInicioDeSesion() throws Exception {
    mvc.perform(
            post("/api/sesion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\": \"x\", \"contrasena\": \"y\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void laSesionExpiraTras30MinutosDeInactividad() {
    assertThat(inactividad).isEqualTo(Duration.ofMinutes(30));
  }

  @Test
  void avisaQueLaSesionExpiro() throws Exception {
    mvc.perform(
            get("/api/sesion")
                .with(
                    s -> {
                      s.setRequestedSessionId("sesion-vencida");
                      s.setRequestedSessionIdValid(false);
                      return s;
                    }))
        .andExpect(status().isUnauthorized())
        .andExpect(
            jsonPath("$.mensaje")
                .value("Su sesión expiró por inactividad. Inicie sesión nuevamente."));
    mvc.perform(get("/api/sesion"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.mensaje").value("Inicie sesión para continuar."));
  }

  @Test
  void pideUsuarioYContrasena() throws Exception {
    ingresar("", "")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.nombreUsuario").value("Ingrese su usuario."))
        .andExpect(jsonPath("$.campos.contrasena").value("Ingrese su contraseña."));
  }
}
