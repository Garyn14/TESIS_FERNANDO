package pe.drasatipo.plataforma.blockchain;

import java.time.Instant;
import java.util.List;

/**
 * Una transacción confirmada de registrarDocumentos (HU11).
 *
 * @param fecha fecha del bloque: es la fecha oficial de emisión (RF32)
 */
public record RegistroDeFirma(
    String transaccion, long bloque, Instant fecha, List<DocumentoRegistrado> documentos) {}
