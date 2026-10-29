package pe.drasatipo.plataforma.usuarios;

import java.time.OffsetDateTime;

/** Cuenta tal como la ve el Administrador. Nunca incluye la contraseña ni su hash (RNF02). */
public record CuentaRespuesta(
    Long id,
    String nombreUsuario,
    String nombreCompleto,
    String rol,
    String rolNombre,
    /** Código y nombre del área (HU05), o null. */
    String area,
    String areaNombre,
    boolean activo,
    boolean debeCambiarContrasena,
    /** Hasta cuándo está bloqueada por intentos fallidos (HU03), o null. */
    OffsetDateTime bloqueadaHasta,
    OffsetDateTime creadoEn) {

  static CuentaRespuesta de(Usuario usuario) {
    return new CuentaRespuesta(
        usuario.getId(),
        usuario.getNombreUsuario(),
        usuario.getNombreCompleto(),
        usuario.getRol().getCodigo(),
        usuario.getRol().getNombre(),
        usuario.getArea() == null ? null : usuario.getArea().getCodigo(),
        usuario.getArea() == null ? null : usuario.getArea().getNombre(),
        usuario.isActivo(),
        usuario.isDebeCambiarContrasena(),
        usuario.estaBloqueada(OffsetDateTime.now()) ? usuario.getBloqueadaHasta() : null,
        usuario.getCreadoEn());
  }
}
