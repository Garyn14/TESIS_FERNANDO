package pe.drasatipo.plataforma.comun;

import java.util.Map;

/**
 * Formato único de error de la API: un mensaje general y, si aplica, el mensaje de cada campo que
 * hay que corregir.
 */
public record ErrorRespuesta(String mensaje, Map<String, String> campos) {}
