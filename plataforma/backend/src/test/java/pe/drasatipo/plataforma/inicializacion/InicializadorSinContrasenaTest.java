package pe.drasatipo.plataforma.inicializacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** Sin PLATAFORMA_ADMIN_CONTRASENA el backend arranca, pero no crea ninguna cuenta. */
@SpringBootTest
@Import(ContenedoresDePrueba.class)
class InicializadorSinContrasenaTest {

  @Autowired JdbcTemplate jdbc;

  @Test
  void noCreaCuentasSiNoHayContrasena() {
    assertThat(jdbc.queryForObject("SELECT count(*) FROM usuario", Integer.class)).isZero();
  }
}
