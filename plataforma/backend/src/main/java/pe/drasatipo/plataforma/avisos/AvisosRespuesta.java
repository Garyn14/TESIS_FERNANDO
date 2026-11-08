package pe.drasatipo.plataforma.avisos;

import java.util.List;

/**
 * Los avisos más recientes de la persona y cuántos tiene sin leer en total.
 *
 * @param sinLeer cuenta todos los no leídos, también los que no están entre los mostrados
 */
public record AvisosRespuesta(List<AvisoRespuesta> avisos, long sinLeer) {}
