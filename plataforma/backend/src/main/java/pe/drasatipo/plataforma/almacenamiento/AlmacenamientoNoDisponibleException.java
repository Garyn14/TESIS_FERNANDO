package pe.drasatipo.plataforma.almacenamiento;

/** El IPFS privado no respondió o rechazó la operación. */
public class AlmacenamientoNoDisponibleException extends RuntimeException {

  public AlmacenamientoNoDisponibleException(String mensaje, Throwable causa) {
    super(mensaje, causa);
  }
}
