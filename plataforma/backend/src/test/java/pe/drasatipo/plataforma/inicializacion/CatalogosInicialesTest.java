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
  void cargaLosCuatroRolesDeRf01YElDeDra58() {
    assertThat(jdbc.queryForList("SELECT codigo FROM rol", String.class))
        .containsExactlyInAnyOrder(
            "ADMINISTRADOR", "AREA_ENCARGADA", "DIRECTOR", "CONSULTA_INTERNA", "MESA_PARTES_AREA");
    // DRA-58: los roles limitados a un área exigen el área y solo ven lo de ella.
    assertThat(jdbc.queryForList("SELECT codigo FROM rol WHERE limitado_al_area", String.class))
        .containsExactlyInAnyOrder("AREA_ENCARGADA", "MESA_PARTES_AREA");
    assertThat(
            jdbc.queryForList(
                "SELECT p.codigo FROM rol_permiso rp JOIN rol r ON r.id = rp.rol_id"
                    + " JOIN permiso p ON p.id = rp.permiso_id WHERE r.codigo = 'MESA_PARTES_AREA'",
                String.class))
        .containsExactlyInAnyOrder(
            "CUENTA_PROPIA", "DOCUMENTO_BUSCAR", "AUDITORIA_VER", "DOCUMENTO_IMPRIMIR");
  }

  @Test
  void cadaRolTieneUnNombreQueDescribeLoQueHace() {
    // DRA-59: los nombres de la tesis "Área encargada" y "Consulta interna" se reemplazan en
    // pantalla.
    assertThat(
            jdbc.queryForList(
                "SELECT codigo || ' = ' || nombre FROM rol ORDER BY codigo", String.class))
        .containsExactly(
            "ADMINISTRADOR = Administrador",
            "AREA_ENCARGADA = Emisor de área",
            "CONSULTA_INTERNA = Mesa de Partes",
            "DIRECTOR = Director",
            "MESA_PARTES_AREA = Mesa de Partes de área");
    assertThat(
            jdbc.queryForObject(
                "SELECT descripcion FROM rol WHERE codigo = 'CONSULTA_INTERNA'", String.class))
        .isEqualTo("Busca, consulta el historial, imprime y entrega documentos");
  }

  @Test
  void asignaPermisosInicialesACadaRol() {
    assertThat(permisosDe("ADMINISTRADOR"))
        .containsExactly(
            "BILLETERA_GESTIONAR", "CATALOGO_GESTIONAR", "CUENTA_PROPIA", "USUARIOS_GESTIONAR");
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
