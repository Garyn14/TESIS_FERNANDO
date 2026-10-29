package pe.drasatipo.plataforma.inicializacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** Verifica los catálogos que carga la migración V3 (RF09). */
@SpringBootTest
@Import(ContenedoresDePrueba.class)
class CatalogosInicialesTest {

  @Autowired JdbcTemplate jdbc;

  private List<String> permisosDe(String rol) {
    return jdbc.queryForList(
        """
        SELECT p.codigo FROM rol_permiso rp
        JOIN rol r ON r.id = rp.rol_id JOIN permiso p ON p.id = rp.permiso_id
        WHERE r.codigo = ? ORDER BY p.codigo
        """,
        String.class,
        rol);
  }

  @Test
  void cargaLosCuatroRolesDeRf01() {
    assertThat(jdbc.queryForList("SELECT codigo FROM rol", String.class))
        .containsExactlyInAnyOrder(
            "ADMINISTRADOR", "AREA_ENCARGADA", "DIRECTOR", "CONSULTA_INTERNA");
  }

  @Test
  void asignaPermisosInicialesACadaRol() {
    assertThat(permisosDe("ADMINISTRADOR"))
        .containsExactly("BILLETERA_GESTIONAR", "CUENTA_PROPIA", "USUARIOS_GESTIONAR");
    assertThat(permisosDe("DIRECTOR"))
        .contains("DOCUMENTO_FIRMAR", "DOCUMENTO_ANULAR")
        .doesNotContain("DOCUMENTO_REGISTRAR");
    assertThat(permisosDe("AREA_ENCARGADA"))
        .contains("DOCUMENTO_REGISTRAR")
        .doesNotContain("DOCUMENTO_FIRMAR");
    assertThat(permisosDe("CONSULTA_INTERNA"))
        .contains("DOCUMENTO_BUSCAR", "AUDITORIA_VER", "DOCUMENTO_IMPRIMIR");
  }

  @Test
  void todosLosRolesPuedenCambiarSuContrasena() {
    Integer roles = jdbc.queryForObject("SELECT count(*) FROM rol", Integer.class);
    Integer conPermiso =
        jdbc.queryForObject(
            """
            SELECT count(*) FROM rol_permiso rp JOIN permiso p ON p.id = rp.permiso_id
            WHERE p.codigo = 'CUENTA_PROPIA'
            """,
            Integer.class);
    assertThat(conPermiso).isEqualTo(roles);
  }

  @Test
  void cargaLosCincoTiposDeDocumentoYCadaUnoTieneArea() {
    assertThat(jdbc.queryForObject("SELECT count(*) FROM tipo_documento", Integer.class))
        .isEqualTo(5);
    Integer sinArea =
        jdbc.queryForObject(
            """
            SELECT count(*) FROM tipo_documento t
            WHERE NOT EXISTS (SELECT 1 FROM area_tipo_documento a WHERE a.tipo_documento_id = t.id)
            """,
            Integer.class);
    assertThat(sinArea).isZero();
  }
}
