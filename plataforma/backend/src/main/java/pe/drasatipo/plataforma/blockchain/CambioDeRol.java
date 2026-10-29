package pe.drasatipo.plataforma.blockchain;

/**
 * Cambio del rol de firmante leído de una transacción confirmada del contrato.
 *
 * @param otorgado true si fue un otorgamiento (RoleGranted); false si fue una revocación
 * @param cuenta billetera que recibió o perdió el rol
 * @param emisor billetera administradora que firmó la transacción
 * @param bloque número de bloque
 */
public record CambioDeRol(boolean otorgado, String cuenta, String emisor, long bloque) {}
