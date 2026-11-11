package pe.drasatipo.plataforma.usuarios;

/**
 * Rol disponible para asignar a una cuenta. {@code limitadoAlArea}: el formulario pide el área
 * (DRA-58).
 */
public record RolRespuesta(
    String codigo, String nombre, String descripcion, boolean limitadoAlArea) {

  static RolRespuesta de(Rol rol) {
    return new RolRespuesta(
        rol.getCodigo(), rol.getNombre(), rol.getDescripcion(), rol.isLimitadoAlArea());
  }
}
