package pe.drasatipo.plataforma.usuarios;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/**
 * HU01 (DRA-12): el Administrador crea cuentas. Hasta HU03 no hay inicio de sesión, así que la
 * sesión se simula con un usuario que tiene el permiso. El nombre "admin.prueba" coincide con la
 * cuenta que crea el inicializador, para registrar quién creó cada cuenta.
 */
@SpringBootTest(
    properties = {
      "plataforma.inicializacion.admin-usuario=admin.prueba",
      "plataforma.inicializacion.admin-contrasena=Temporal2026"
    })
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
@Transactional
@ExtendWith(OutputCaptureExtension.class)
@WithMockUser(username = "admin.prueba", authorities = "USUARIOS_GESTIONAR")
class CrearCuentaTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  private ResultActions crear(String usuario, String nombre, String rol, String contrasena)
      throws Exception {
    String cuerpo =
        """
        {"nombreUsuario": %s, "nombreCompleto": %s, "rol": %s, "area": %s,
         "contrasenaTemporal": %s}
        """
            .formatted(
                json(usuario),
                json(nombre),
                json(rol),
                // HU05: el Área encargada exige área; aquí se usa una cualquiera.
                json("AREA_ENCARGADA".equals(rol) ? "CAPACITACION" : null),
                json(contrasena));
    return mvc.perform(
        post("/api/usuarios").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo));
  }

  private static String json(String valor) {
    return valor == null ? "null" : "\"" + valor + "\"";
  }

  private Map<String, Object> fila(String nombreUsuario) {
    return jdbc.queryForMap(
        """
        SELECT u.*, r.codigo AS rol_codigo, c.nombre_usuario AS creador
        FROM usuario u JOIN rol r ON r.id = u.rol_id LEFT JOIN usuario c ON c.id = u.creado_por
        WHERE u.nombre_usuario = ?
        """,
        nombreUsuario);
  }

  @Test
  void creaLaCuentaActivaConUnRolYContrasenaTemporal() throws Exception {
    crear("jperez", "Juan Pérez Quispe", "AREA_ENCARGADA", "Clave2026!")
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/usuarios/")))
        .andExpect(jsonPath("$.nombreUsuario").value("jperez"))
        .andExpect(jsonPath("$.rol").value("AREA_ENCARGADA"))
        .andExpect(jsonPath("$.rolNombre").value("Área encargada"))
        .andExpect(jsonPath("$.activo").value(true))
        .andExpect(jsonPath("$.debeCambiarContrasena").value(true))
        .andExpect(jsonPath("$.creadoEn").exists());

    var cuenta = fila("jperez");
    assertThat(cuenta.get("rol_codigo")).isEqualTo("AREA_ENCARGADA");
    assertThat(cuenta.get("activo")).isEqualTo(true);
    assertThat(cuenta.get("debe_cambiar_contrasena")).isEqualTo(true);
    assertThat(cuenta.get("creador")).isEqualTo("admin.prueba");
  }

  @Test
  void guardaLaContrasenaConHashYNuncaLaDevuelveNiLaRegistra(CapturedOutput salida)
      throws Exception {
    String respuesta =
        crear("mquispe", "María Quispe", "DIRECTOR", "Secreta2026")
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String hash = (String) fila("mquispe").get("contrasena_hash");
    assertThat(hash).startsWith("{bcrypt}");
    assertThat(codificador.matches("Secreta2026", hash)).isTrue();
    assertThat(respuesta)
        .doesNotContain("Secreta2026")
        .doesNotContain("contrasenaTemporal")
        .doesNotContain("contrasenaHash");
    assertThat(respuesta).doesNotContain("bcrypt");
    assertThat(salida.getAll()).doesNotContain("Secreta2026");
  }

  @Test
  void normalizaElNombreDeUsuarioAMinusculas() throws Exception {
    crear("  RQuispe ", "  Rosa Quispe  ", "CONSULTA_INTERNA", "Clave2026!")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.nombreUsuario").value("rquispe"))
        .andExpect(jsonPath("$.nombreCompleto").value("Rosa Quispe"));
  }

  @Test
  void rechazaUnNombreDeUsuarioRepetidoAunqueCambienLasMayusculas() throws Exception {
    crear("lrojas", "Luis Rojas", "DIRECTOR", "Clave2026!").andExpect(status().isCreated());

    crear("LRojas", "Otra Persona", "CONSULTA_INTERNA", "Clave2026!")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("El nombre de usuario ya está registrado."))
        .andExpect(
            jsonPath("$.campos.nombreUsuario").value("El nombre de usuario ya está registrado."));

    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE lower(nombre_usuario) = 'lrojas'",
                Integer.class))
        .isEqualTo(1);
  }

  @Test
  void laBaseDeDatosImpideDuplicadosConOtrasMayusculas() {
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id)
                    SELECT 'ADMIN.PRUEBA', 'Duplicado', 'x', id FROM rol WHERE codigo = 'DIRECTOR'
                    """))
        .hasMessageContaining("usuario_nombre_usuario_minusculas_uk");
  }

  @Test
  void indicaCadaCampoQueHayQueCorregir() throws Exception {
    crear("1ab", "", null, "corta")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.mensaje").value("Revise los datos ingresados."))
        .andExpect(
            jsonPath("$.campos.nombreUsuario")
                .value(
                    "Use de 4 a 30 caracteres: letras sin tildes, números, punto o guion bajo,"
                        + " empezando con una letra."))
        .andExpect(jsonPath("$.campos.nombreCompleto").value("Ingrese el nombre completo."))
        .andExpect(jsonPath("$.campos.rol").value("Seleccione un rol."))
        .andExpect(
            jsonPath("$.campos.contrasenaTemporal")
                .value("La contraseña debe tener de 8 a 20 caracteres."));
  }

  @Test
  void rechazaNombresDeUsuarioConTildesOEspacios() throws Exception {
    crear("josé.p", "José P", "DIRECTOR", "Clave2026!")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.nombreUsuario").exists());
    crear("jose perez", "José P", "DIRECTOR", "Clave2026!")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.nombreUsuario").exists());
  }

  @Test
  void rechazaUnaContrasenaDeMasDe20Caracteres() throws Exception {
    crear("jlarga", "Juan Larga", "DIRECTOR", "a".repeat(21))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.contrasenaTemporal").exists());
  }

  @Test
  void rechazaUnRolQueNoExiste() throws Exception {
    crear("jsinrol", "Juan Sin Rol", "SUPERUSUARIO", "Clave2026!")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.rol").value("Seleccione un rol válido."));
  }

  @Test
  void listaLasCuentasConLaNuevaPrimero() throws Exception {
    crear("cnueva", "Cuenta Nueva", "DIRECTOR", "Clave2026!").andExpect(status().isCreated());

    mvc.perform(get("/api/usuarios"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].nombreUsuario").value("cnueva"))
        .andExpect(jsonPath("$[0].contrasenaHash").doesNotExist())
        .andExpect(jsonPath("$[?(@.nombreUsuario == 'admin.prueba')]").exists());
  }

  @Test
  void listaLosCuatroRolesParaElFormulario() throws Exception {
    mvc.perform(get("/api/roles"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(4))
        .andExpect(jsonPath("$[?(@.codigo == 'ADMINISTRADOR')].nombre").value("Administrador"));
  }
}
