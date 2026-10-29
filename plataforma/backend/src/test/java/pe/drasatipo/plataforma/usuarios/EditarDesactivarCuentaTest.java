package pe.drasatipo.plataforma.usuarios;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/**
 * HU02 (DRA-13): editar, desactivar y reactivar cuentas. La sesión del Administrador se simula
 * hasta HU03, con el nombre de la cuenta que crea el inicializador ("admin.prueba").
 */
@SpringBootTest(
    properties = {
      "plataforma.inicializacion.admin-usuario=admin.prueba",
      "plataforma.inicializacion.admin-contrasena=Temporal2026"
    })
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
@Transactional
@WithMockUser(username = "admin.prueba", authorities = "USUARIOS_GESTIONAR")
class EditarDesactivarCuentaTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired EntityManager em;

  /** La prueba es transaccional: se envían los cambios pendientes antes de leer con JDBC. */
  private Map<String, Object> filaDe(long id) {
    em.flush();
    return jdbc.queryForMap("SELECT * FROM usuario WHERE id = ?", id);
  }

  private long crear(String usuario, String nombre, String rol) throws Exception {
    String cuerpo =
        """
        {"nombreUsuario": "%s", "nombreCompleto": "%s", "rol": "%s",
         "contrasenaTemporal": "Clave2026!"}
        """
            .formatted(usuario, nombre, rol);
    String respuesta =
        mvc.perform(
                post("/api/usuarios")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(cuerpo))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return ((Number) JsonPath.read(respuesta, "$.id")).longValue();
  }

  private ResultActions editar(long id, String nombre, String rol, RequestPostProcessor... sesion)
      throws Exception {
    var solicitud =
        put("/api/usuarios/" + id)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nombreCompleto\": \"%s\", \"rol\": \"%s\"}".formatted(nombre, rol));
    for (RequestPostProcessor s : sesion) {
      solicitud.with(s);
    }
    return mvc.perform(solicitud);
  }

  private ResultActions accion(long id, String accion, RequestPostProcessor... sesion)
      throws Exception {
    var solicitud = post("/api/usuarios/%d/%s".formatted(id, accion)).with(csrf());
    for (RequestPostProcessor s : sesion) {
      solicitud.with(s);
    }
    return mvc.perform(solicitud);
  }

  private long idDe(String nombreUsuario) {
    return jdbc.queryForObject(
        "SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, nombreUsuario);
  }

  private List<Map<String, Object>> historial(long id) {
    em.flush();
    return jdbc.queryForList(
        """
        SELECT h.evento, h.detalle, a.nombre_usuario AS actor
        FROM usuario_historial h LEFT JOIN usuario a ON a.id = h.realizado_por
        WHERE h.usuario_id = ? ORDER BY h.id
        """,
        id);
  }

  /** Sesión de una cuenta que tiene el permiso pero no es Administrador. */
  private static RequestPostProcessor gestor() {
    return user("gestor").authorities(() -> "USUARIOS_GESTIONAR");
  }

  @Test
  void editaElNombreCompletoYElRolYLoRegistraEnElHistorial() throws Exception {
    long id = crear("lrojas", "Luis Rojas", "DIRECTOR");

    editar(id, "Luis Rojas Paredes", "CONSULTA_INTERNA")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nombreUsuario").value("lrojas"))
        .andExpect(jsonPath("$.nombreCompleto").value("Luis Rojas Paredes"))
        .andExpect(jsonPath("$.rol").value("CONSULTA_INTERNA"));

    assertThat(historial(id))
        .extracting(h -> h.get("evento"), h -> h.get("detalle"), h -> h.get("actor"))
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("CREADA", "Rol: Director", "admin.prueba"),
            org.assertj.core.groups.Tuple.tuple(
                "EDITADA",
                "Nombre completo: Luis Rojas → Luis Rojas Paredes; Rol: Director → Consulta interna",
                "admin.prueba"));
  }

  @Test
  void elNombreDeUsuarioNoCambiaAunqueSeEnvie() throws Exception {
    long id = crear("acruz", "Ana Cruz", "DIRECTOR");
    mvc.perform(
            put("/api/usuarios/" + id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nombreUsuario": "otro", "nombreCompleto": "Ana Cruz", "rol": "DIRECTOR"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nombreUsuario").value("acruz"));
  }

  @Test
  void sinCambiosNoRegistraNingunEvento() throws Exception {
    long id = crear("ssinc", "Sin Cambios", "DIRECTOR");
    editar(id, "  Sin Cambios ", "DIRECTOR").andExpect(status().isOk());
    assertThat(historial(id)).hasSize(1);
  }

  @Test
  void validaLosDatosEditados() throws Exception {
    long id = crear("vdatos", "Valida Datos", "DIRECTOR");
    editar(id, "", "INEXISTENTE")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.nombreCompleto").value("Ingrese el nombre completo."));
    editar(id, "Valida Datos", "INEXISTENTE")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.rol").value("Seleccione un rol válido."));
  }

  @Test
  void respondeNoEncontradaSiLaCuentaNoExiste() throws Exception {
    editar(999999, "Nadie", "DIRECTOR")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("La cuenta no existe."));
    accion(999999, "desactivar").andExpect(status().isNotFound());
  }

  @Test
  void desactivaSinBorrarLaCuentaNiSuHistorial() throws Exception {
    long id = crear("ptorres", "Pedro Torres", "AREA_ENCARGADA");

    accion(id, "desactivar")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activo").value(false))
        .andExpect(jsonPath("$.rol").value("AREA_ENCARGADA"));

    var cuenta = filaDe(id);
    assertThat(cuenta.get("activo")).isEqualTo(false);
    assertThat(cuenta.get("nombre_completo")).isEqualTo("Pedro Torres");
    assertThat(historial(id))
        .extracting(h -> h.get("evento"))
        .containsExactly("CREADA", "DESACTIVADA");
  }

  @Test
  void reactivaConElMismoRol() throws Exception {
    long id = crear("rvega", "Rosa Vega", "CONSULTA_INTERNA");
    accion(id, "desactivar").andExpect(status().isOk());

    accion(id, "reactivar")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activo").value(true))
        .andExpect(jsonPath("$.rol").value("CONSULTA_INTERNA"));
    assertThat(historial(id))
        .extracting(h -> h.get("evento"))
        .containsExactly("CREADA", "DESACTIVADA", "REACTIVADA");
  }

  @Test
  void repetirLaMismaAccionNoDuplicaElHistorial() throws Exception {
    long id = crear("dobleacc", "Doble Accion", "DIRECTOR");
    accion(id, "desactivar").andExpect(status().isOk());
    accion(id, "desactivar").andExpect(status().isOk());
    accion(id, "reactivar").andExpect(status().isOk());
    accion(id, "reactivar").andExpect(status().isOk());
    assertThat(historial(id)).hasSize(3);
  }

  @Test
  void elAdministradorNoPuedeDesactivarseNiCambiarseElRol() throws Exception {
    crear("admin.dos", "Segundo Administrador", "ADMINISTRADOR");
    long propio = idDe("admin.prueba");

    accion(propio, "desactivar")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("No puede desactivar su propia cuenta."));
    editar(propio, "Administrador", "DIRECTOR")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.campos.rol").value("No puede cambiar su propio rol."));
    // Sí puede corregir su propio nombre.
    editar(propio, "Administrador General", "ADMINISTRADOR").andExpect(status().isOk());
  }

  @Test
  void siempreQuedaAlMenosUnAdministradorActivo() throws Exception {
    crear("gestor", "Gestor de cuentas", "CONSULTA_INTERNA");
    long unicoAdmin = idDe("admin.prueba");

    accion(unicoAdmin, "desactivar", gestor())
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("Debe quedar al menos un Administrador activo."));
    editar(unicoAdmin, "Administrador", "DIRECTOR", gestor())
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.campos.rol").value("Debe quedar al menos un Administrador activo."));

    crear("admin.dos", "Segundo Administrador", "ADMINISTRADOR");
    accion(unicoAdmin, "desactivar", gestor())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activo").value(false));
  }

  @Test
  void laMigracionDejaElEventoDeCreacionDeLaPrimeraCuenta() {
    assertThat(historial(idDe("admin.prueba")))
        .extracting(h -> h.get("evento"), h -> h.get("actor"))
        .containsExactly(org.assertj.core.groups.Tuple.tuple("CREADA", null));
  }
}
