package pe.drasatipo.plataforma.consulta;

import java.time.OffsetDateTime;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;

/**
 * Ficha de un documento para Mesa de Partes (HU23): su estado y sus datos básicos. No incluye el
 * HMAC del DNI, el token del QR, el CID ni las transacciones.
 *
 * @param origen SOLICITUD_PARTE u OFICIO
 * @param evento en un certificado de lote, el nombre del evento
 * @param motivo de la observación, del rechazo o de la anulación, según el estado
 * @param firmadoEn cuándo se registró la firma en la blockchain
 * @param anuladoEn cuándo se registró la anulación en la blockchain
 * @param reemplazaA si es una reemisión, el código del documento que reemplaza
 * @param reemisionEnCurso el código de su reemisión mientras está en revisión
 * @param reemplazadoPor el código de la reemisión que lo reemplazó, ya firmada
 * @param impresiones cuántas veces Mesa de Partes lo imprimió (HU25)
 * @param descargas cuántas veces Mesa de Partes descargó su PDF (HU25)
 */
public record FichaDelDocumento(
    String codigo,
    String tipoNombre,
    String origen,
    EstadoDocumento estado,
    String beneficiario,
    String dni,
    String numeroExpediente,
    String areaNombre,
    String lote,
    String evento,
    OffsetDateTime registradoEn,
    String motivo,
    OffsetDateTime firmadoEn,
    OffsetDateTime anuladoEn,
    String reemplazaA,
    String reemisionEnCurso,
    String reemplazadoPor,
    long impresiones,
    long descargas) {}
