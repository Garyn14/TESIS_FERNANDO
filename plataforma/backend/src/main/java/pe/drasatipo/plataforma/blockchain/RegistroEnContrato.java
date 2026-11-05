package pe.drasatipo.plataforma.blockchain;

import java.time.Instant;

/**
 * El registro de un documento en el contrato, leído con {@code consultar(codigo)} (HU21).
 *
 * @param hashPdf SHA-256 del PDF final, en hexadecimal sin 0x
 * @param dniHmac HMAC del DNI, en hexadecimal sin 0x
 * @param firmante billetera que lo registró (con suma de verificación EIP-55)
 * @param registradoEn fecha del bloque del registro: la fecha oficial de emisión (RF32)
 */
public record RegistroEnContrato(
    String hashPdf, String dniHmac, String firmante, Instant registradoEn) {}
