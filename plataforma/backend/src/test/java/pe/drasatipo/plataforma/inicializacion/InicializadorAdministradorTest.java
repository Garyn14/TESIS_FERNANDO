package pe.drasatipo.plataforma.inicializacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

@SpringBootTest(
    properties = {
      "plataforma.inicializacion.admin-usuario=admin.prueba",
      "plataforma.inicializacion.admin-contrasena=Temporal2026"
    })
@Import(ContenedoresDePrueba.class)
class InicializadorAdministradorTest {

  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired InicializadorAdministrador inicializador;

  private int administradores() {
    return jdbc.queryForObject(
        """
        SELECT count(*) FROM usuario u JOIN rol r ON r.id = u.rol_id
        WHERE r.codigo = 'ADMINISTRADOR'
        """,
        Integer.class);
  }

  @Test
  void creaElAdministradorConContrasenaTemporalYHasheada() {
    var cuenta =
        jdbc.queryForMap(
            "SELECT contrasena_hash, debe_cambiar_contrasena, activo FROM usuario"
                + " WHERE nombre_usuario = 'admin.prueba'");
    String hash = (String) cuenta.get("contrasena_hash");

    assertThat(administradores()).isEqualTo(1);
    assertThat(hash).startsWith("{bcrypt}").doesNotContain("Temporal2026");
    assertThat(codificador.matches("Temporal2026", hash)).isTrue();
    assertThat(cuenta.get("debe_cambiar_contrasena")).isEqualTo(true);
    assertThat(cuenta.get("activo")).isEqualTo(true);
  }

  @Test
  void noCreaUnSegundoAdministradorAlVolverAEjecutarse() {
    inicializador.run(new DefaultApplicationArguments());
    assertThat(administradores()).isEqualTo(1);
  }
}
