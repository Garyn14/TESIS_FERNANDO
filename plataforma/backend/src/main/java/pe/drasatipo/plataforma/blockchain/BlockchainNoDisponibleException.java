package pe.drasatipo.plataforma.blockchain;

/** No se pudo consultar la blockchain, o el contrato todavía no está configurado (RNF10). */
public class BlockchainNoDisponibleException extends RuntimeException {

  public BlockchainNoDisponibleException(String mensaje, Throwable causa) {
    super(mensaje, causa);
  }
}
