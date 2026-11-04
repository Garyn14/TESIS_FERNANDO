package pe.drasatipo.plataforma.blockchain;

/**
 * Un documento registrado en el contrato (evento DocumentoRegistrado, HU11).
 *
 * @param codigo código de verificación
 * @param hashPdf SHA-256 del PDF final, en hexadecimal sin 0x
 * @param dniHmac HMAC del DNI, en hexadecimal sin 0x
 * @param firmante billetera que lo firmó (con suma de verificación EIP-55)
 */
public record DocumentoRegistrado(String codigo, String hashPdf, String dniHmac, String firmante) {}
