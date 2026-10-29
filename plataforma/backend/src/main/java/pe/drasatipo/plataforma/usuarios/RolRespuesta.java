package pe.drasatipo.plataforma.usuarios;

/** Rol disponible para asignar a una cuenta. */
public record RolRespuesta(String codigo, String nombre, String descripcion) {

  static RolRespuesta de(Rol rol) {
    return new RolRespuesta(rol.getCodigo(), rol.getNombre(), rol.getDescripcion());
  }
}
