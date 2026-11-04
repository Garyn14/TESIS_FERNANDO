package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Detalle de un documento. Nunca incluye el HMAC del DNI ni el token del QR. {@code datos} son los
 * campos propios del tipo, para precargar la corrección (HU15) y la reemisión (HU30).
 *
 * <p>HU30: {@code reemision} dice de qué documento es reemisión, con su motivo y sus cambios;
 * {@code reemisionEnCurso} y {@code reemplazadoPor} son el código de la reemisión de este documento
 * mientras está en revisión y después de firmarse.
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
    boolean corregido,
    Reemision reemision,
    String reemisionEnCurso,
    String reemplazadoPor) {

  /** HU30: el documento que esta reemisión reemplaza, el motivo y lo que cambia. */
  public record Reemision(String original, String motivo, List<String> cambios) {}

  static DocumentoRespuesta de(Documento documento, String firmante) {
    return de(documento, firmante, null);
  }

  /**
   * @param suReemision la reemisión vigente de este documento (no rechazada), o null
   */
  static DocumentoRespuesta de(Documento documento, String firmante, Documento suReemision) {
    boolean reemplazado =
        suReemision != null
            && (suReemision.getEstado() == EstadoDocumento.FIRMADO
                || suReemision.getEstado() == EstadoDocumento.ANULADO);
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
        documento.isCorregido(),
        documento.isReemision()
            ? new Reemision(
                documento.getReemplazaA().getCodigo(),
                documento.getMotivoReemision(),
                CambiosDeDatos.deReemision(documento))
            : null,
        suReemision == null || reemplazado ? null : suReemision.getCodigo(),
        reemplazado ? suReemision.getCodigo() : null);
  }
}
