package pe.drasatipo.plataforma.billeteras;

/**
 * Cuenta en la pantalla "Billetera del director" (HU06).
 *
 * @param firmante estado leído de la blockchain; null si no tiene billetera o si la blockchain no
 *     respondió
 */
public record CuentaConBilletera(
    Long id,
    String nombreUsuario,
    String nombreCompleto,
    String rol,
    String rolNombre,
    boolean activo,
    String billetera,
    Boolean firmante) {}
