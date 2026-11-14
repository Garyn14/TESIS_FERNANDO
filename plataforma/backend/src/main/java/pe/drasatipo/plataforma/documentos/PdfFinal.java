package pe.drasatipo.plataforma.documentos;

import java.util.Arrays;
import java.util.Objects;

/**
 * El PDF final de un documento y su hash SHA-256 en hexadecimal (HU16, RF30). El hash es el de los
 * bytes exactos del archivo: es lo que se registra en la blockchain (RF31).
 */
public record PdfFinal(byte[] contenido, String sha256) {

  // DRA-81: un record compara un arreglo por su referencia; aquí se compara su contenido, y el
  // texto muestra el tamaño del PDF, no sus bytes.
  @Override
  public boolean equals(Object otro) {
    return otro instanceof PdfFinal pdf
        && Arrays.equals(contenido, pdf.contenido)
        && Objects.equals(sha256, pdf.sha256);
  }

  @Override
  public int hashCode() {
    return 31 * Arrays.hashCode(contenido) + Objects.hashCode(sha256);
  }

  @Override
  public String toString() {
    return "PdfFinal["
        + (contenido == null ? 0 : contenido.length)
        + " bytes, sha256="
        + sha256
        + "]";
  }
}
