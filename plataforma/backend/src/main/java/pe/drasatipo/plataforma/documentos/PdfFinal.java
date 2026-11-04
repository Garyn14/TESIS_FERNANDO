package pe.drasatipo.plataforma.documentos;

/**
 * El PDF final de un documento y su hash SHA-256 en hexadecimal (HU16, RF30). El hash es el de los
 * bytes exactos del archivo: es lo que se registra en la blockchain (RF31).
 */
public record PdfFinal(byte[] contenido, String sha256) {}
