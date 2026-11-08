package pe.drasatipo.plataforma.avisos;

import java.time.OffsetDateTime;

/**
 * Un aviso de la persona.
 *
 * @param enlace la ruta de la plataforma que abre, sin "#/"
 * @param leido si ya lo marcó como leído
 */
public record AvisoRespuesta(
    long id,
    TipoDeAviso tipo,
    String texto,
    String enlace,
    OffsetDateTime creadoEn,
    boolean leido) {}
