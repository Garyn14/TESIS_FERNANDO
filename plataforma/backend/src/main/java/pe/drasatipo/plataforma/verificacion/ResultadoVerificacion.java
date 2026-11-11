package pe.drasatipo.plataforma.verificacion;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Lo que el portal público muestra de una verificación (HU21, RF38, RF41). Nunca incluye el DNI, su
 * HMAC, el CID ni datos internos. En un resultado No válido no hay datos del documento.
 *
 * @param fechaEmision fecha del bloque del registro: la fecha oficial de emisión (RF32)
 * @param anuladoEn fecha del bloque de la anulación, si está anulado
 * @param versionCorregida si un documento anulado fue reemplazado por una reemisión (HU30); el
 *     código de la versión corregida no se revela (RF41)
 * @param venceEn DRA-62: hasta qué fecha (inclusive) es válido, impresa en el PDF; null si no vence
 */
public record ResultadoVerificacion(
    Resultado resultado,
    String mensaje,
    String tipo,
    String titular,
    OffsetDateTime fechaEmision,
    OffsetDateTime anuladoEn,
    boolean versionCorregida,
    LocalDate venceEn) {

  public enum Resultado {
    VALIDO,
    ANULADO,
    /** DRA-62: auténtico, pero su vigencia terminó. No se muestra el PDF, igual que un anulado. */
    VENCIDO,
    NO_VALIDO
  }

  static final String MENSAJE_VALIDO =
      "El documento es auténtico: coincide con su registro en la blockchain.";
  static final String MENSAJE_ANULADO = "Este documento fue anulado y ya no es válido.";
  static final String MENSAJE_VENCIDO = "Este documento venció el %s y ya no está vigente.";
  static final String MENSAJE_NO_VALIDO = "No encontramos un documento válido con estos datos.";

  static ResultadoVerificacion noValido() {
    return new ResultadoVerificacion(
        Resultado.NO_VALIDO, MENSAJE_NO_VALIDO, null, null, null, null, false, null);
  }
}
