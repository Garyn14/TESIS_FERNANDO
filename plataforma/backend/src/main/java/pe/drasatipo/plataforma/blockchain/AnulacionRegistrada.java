package pe.drasatipo.plataforma.blockchain;

import java.time.Instant;

/**
 * Una anulación leída en el contrato (evento DocumentoAnulado, HU29).
 *
 * @param firmante billetera que anuló (con suma de verificación EIP-55)
 * @param fecha fecha del bloque de la anulación
 */
public record AnulacionRegistrada(
    String codigo, String firmante, String transaccion, long bloque, Instant fecha) {}
