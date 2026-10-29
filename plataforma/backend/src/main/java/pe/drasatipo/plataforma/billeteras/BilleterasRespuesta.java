package pe.drasatipo.plataforma.billeteras;

import java.util.List;

/**
 * @param blockchainDisponible false si no se pudo leer el contrato: los estados de firmante quedan
 *     en null en lugar de suponerse (RNF10)
 * @param aviso motivo cuando la blockchain no está disponible
 */
public record BilleterasRespuesta(
    boolean blockchainDisponible, String aviso, List<CuentaConBilletera> cuentas) {}
