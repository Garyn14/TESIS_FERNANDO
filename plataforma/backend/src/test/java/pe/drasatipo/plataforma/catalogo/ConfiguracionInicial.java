package pe.drasatipo.plataforma.catalogo;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Las áreas de la migración V3 (activas y con su nombre) y su relación con los tipos de documento,
 * para restaurarlas en las pruebas. Las áreas creadas por las pruebas (DRA-61) se quedan, con
 * nombres únicos, pero deshabilitadas: las demás pruebas esperan solo las tres áreas iniciales.
 */
public final class ConfiguracionInicial {

  private ConfiguracionInicial() {}

  public static void restaurar(JdbcTemplate jdbc) {
    jdbc.update(
        """
        UPDATE area SET activa = true, nombre = inicial.nombre
        FROM (VALUES
            ('CAPACITACION',       'Área de Capacitación'),
            ('DESARROLLO_AGRARIO', 'Área de Desarrollo Agrario'),
            ('ADMINISTRACION',     'Área de Administración')
        ) AS inicial (codigo, nombre)
        WHERE area.codigo = inicial.codigo
        """);
    jdbc.update(
        "UPDATE area SET activa = false WHERE codigo NOT IN"
            + " ('CAPACITACION', 'DESARROLLO_AGRARIO', 'ADMINISTRACION')");
    jdbc.update(
        "DELETE FROM area_tipo_documento WHERE area_id IN (SELECT id FROM area WHERE codigo IN"
            + " ('CAPACITACION', 'DESARROLLO_AGRARIO', 'ADMINISTRACION'))");
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
