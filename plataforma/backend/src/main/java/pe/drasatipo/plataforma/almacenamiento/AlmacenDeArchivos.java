package pe.drasatipo.plataforma.almacenamiento;

/** Almacenamiento de los PDF finales (HU17, RF30): el IPFS privado de la plataforma. */
public interface AlmacenDeArchivos {

  /**
   * Guarda el archivo, fijado para que no se borre, y devuelve su identificador de contenido (CID).
   *
   * @throws AlmacenamientoNoDisponibleException si no se pudo guardar
   */
  String guardar(String nombre, byte[] contenido);

  /**
   * Recupera un archivo por su CID (HU21, HU25).
   *
   * @throws AlmacenamientoNoDisponibleException si no se pudo recuperar
   */
  byte[] recuperar(String cid);
}
