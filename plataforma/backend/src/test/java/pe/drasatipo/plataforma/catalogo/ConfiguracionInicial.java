package pe.drasatipo.plataforma.catalogo;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * La relación de áreas y tipos de documento de la migración V3, para restaurarla en las pruebas.
 */
public final class ConfiguracionInicial {

  private ConfiguracionInicial() {}

  public static void restaurar(JdbcTemplate jdbc) {
    jdbc.update("DELETE FROM area_tipo_documento");
    jdbc.update(
        """
        INSERT INTO area_tipo_documento (area_id, tipo_documento_id)
        SELECT a.id, t.id
        FROM (VALUES
            ('CAPACITACION',       'CERTIFICADO_CAPACITACION'),
            ('CAPACITACION',       'CERTIFICADO_RECONOCIMIENTO'),
            ('DESARROLLO_AGRARIO', 'CONSTANCIA_PRODUCTOR_ACTIVO'),
            ('ADMINISTRACION',     'CERTIFICADO_PRACTICAS'),
            ('ADMINISTRACION',     'CERTIFICADO_TRABAJO')
        ) AS asignacion (area, tipo)
        JOIN area a ON a.codigo = asignacion.area
        JOIN tipo_documento t ON t.codigo = asignacion.tipo
        """);
  }
}
