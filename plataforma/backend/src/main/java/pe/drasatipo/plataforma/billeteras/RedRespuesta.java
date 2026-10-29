package pe.drasatipo.plataforma.billeteras;

/**
 * Datos de la red para la billetera del navegador (HU06).
 *
 * @param chainIdHex chainId en hexadecimal, como lo pide MetaMask
 * @param firmanteRol identificador del rol de firmante en el contrato
 */
public record RedRespuesta(
    long chainId,
    String chainIdHex,
    String nombre,
    String rpcUrl,
    String contrato,
    String firmanteRol) {}
