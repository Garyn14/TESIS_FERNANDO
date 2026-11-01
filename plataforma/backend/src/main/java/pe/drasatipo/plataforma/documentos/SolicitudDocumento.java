package pe.drasatipo.plataforma.documentos;

import java.util.Map;

/**
 * Datos de un documento a solicitud de parte (HU08). {@code datos} lleva los campos propios del
 * tipo, según su plantilla; las fechas van en formato ISO (2026-06-01).
 */
public record SolicitudDocumento(
    String tipo,
    String numeroExpediente,
    String nombres,
    String apellidos,
    String dni,
    Map<String, String> datos) {}
