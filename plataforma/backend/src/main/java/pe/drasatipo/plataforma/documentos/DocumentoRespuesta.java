package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Detalle de un documento. Nunca incluye el HMAC del DNI ni el token del QR. {@code datos} son los
 * campos propios del tipo, para precargar la corrección (HU15).
 */
public record DocumentoRespuesta(
    String codigo,
    String tipo,
    String tipoNombre,
    String titulo,
    String origen,
    EstadoDocumento estado,
    String numeroExpediente,
    String lote,
    String nombres,
    String apellidos,
    String dni,
    String texto,
    String areaNombre,
    String registradoPor,
    OffsetDateTime registradoEn,
    String firmante,
    String motivo,
    Map<String, String> datos,
    boolean corregido) {

  static DocumentoRespuesta de(Documento documento, String firmante) {
    return new DocumentoRespuesta(
        documento.getCodigo(),
        documento.getTipo().getCodigo(),
        documento.getTipo().getNombre(),
        documento.getTipo().getTitulo(),
        documento.getOrigen(),
        documento.getEstado(),
        documento.getNumeroExpediente(),
        documento.getLote() == null ? null : documento.getLote().getNumero(),
        documento.getNombres(),
        documento.getApellidos(),
        documento.getDni(),
        documento.getTexto(),
        documento.getArea().getNombre(),
        documento.getRegistradoPor().getNombreCompleto(),
        documento.getRegistradoEn(),
        firmante,
        // HU29: en un anulado, el motivo es el de la anulación.
        documento.getEstado() == EstadoDocumento.ANULADO
            ? documento.getMotivoAnulacion()
            : documento.getMotivo(),
        documento.getDatos(),
        documento.isCorregido());
  }
}
