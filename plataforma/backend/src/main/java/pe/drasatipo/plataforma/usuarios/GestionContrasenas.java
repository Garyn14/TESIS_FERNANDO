package pe.drasatipo.plataforma.usuarios;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.comun.ValidadorDeSolicitudes;

/** Cambio de la contraseña propia y restablecimiento por el Administrador (HU04, RF03). */
@Service
public class GestionContrasenas {

  static final String ACTUAL_INCORRECTA = "La contraseña actual no es correcta.";
  static final String NUEVA_IGUAL = "La contraseña nueva debe ser distinta de la actual.";
  static final String RESTABLECER_PROPIA =
      "Para su propia cuenta use \"Cambiar contraseña\", que pide la contraseña actual.";

  private static final Logger log = LoggerFactory.getLogger(GestionContrasenas.class);

  private final UsuarioRepository usuarios;
  private final HistorialRepository historial;
  private final PasswordEncoder codificador;
  private final ValidadorDeSolicitudes validador;

  public GestionContrasenas(
      UsuarioRepository usuarios,
      HistorialRepository historial,
      PasswordEncoder codificador,
      ValidadorDeSolicitudes validador) {
    this.usuarios = usuarios;
    this.historial = historial;
    this.codificador = codificador;
    this.validador = validador;
  }

  /**
   * HU04: cambia la contraseña propia. Exige la actual. Devuelve el momento del cambio, con el que
   * la sesión actual sigue siendo válida y las demás de la cuenta se cierran.
   */
  @Transactional
  public Instant cambiarPropia(Long idCuenta, CambioContrasenaSolicitud datos) {
    validador.validar(datos);
    Usuario cuenta = usuarios.findById(idCuenta).orElseThrow();
    if (!codificador.matches(datos.contrasenaActual(), cuenta.getContrasenaHash())) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, "contrasenaActual", ACTUAL_INCORRECTA);
    }
    if (datos.contrasenaNueva().equals(datos.contrasenaActual())) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "contrasenaNueva", NUEVA_IGUAL);
    }
    cuenta.cambiarContrasena(codificador.encode(datos.contrasenaNueva()));
    historial.save(
        new RegistroHistorial(
            cuenta.getId(), EventoCuenta.CONTRASENA_CAMBIADA, null, cuenta.getId()));
    log.info("Cuenta '{}': cambió su contraseña.", cuenta.getNombreUsuario());
    return cuenta.getContrasenaCambiadaEn();
  }

  /**
   * HU04: el Administrador asigna una contraseña temporal. Desbloquea la cuenta, obliga a cambiarla
   * en el siguiente ingreso y cierra sus sesiones abiertas.
   */
  @Transactional
  public CuentaRespuesta restablecer(
      Long idCuenta, RestablecimientoSolicitud datos, String nombreUsuarioActor) {
    validador.validar(datos);
    Usuario cuenta =
        usuarios
            .findConRolById(idCuenta)
            .orElseThrow(
                () ->
                    new ReglaDeNegocioException(
                        HttpStatus.NOT_FOUND, null, GestionUsuarios.CUENTA_INEXISTENTE));
    Usuario actor = usuarios.findByNombreUsuarioIgnoreCase(nombreUsuarioActor).orElseThrow();
    if (cuenta.getId().equals(actor.getId())) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, RESTABLECER_PROPIA);
    }
    boolean estabaBloqueada = cuenta.estaBloqueada(java.time.OffsetDateTime.now());
    cuenta.restablecerContrasena(codificador.encode(datos.contrasenaTemporal()));
    historial.save(
        new RegistroHistorial(
            cuenta.getId(),
            EventoCuenta.CONTRASENA_RESTABLECIDA,
            estabaBloqueada ? "La cuenta estaba bloqueada y quedó desbloqueada" : null,
            actor.getId()));
    log.info(
        "Cuenta '{}': contraseña restablecida por '{}'.",
        cuenta.getNombreUsuario(),
        actor.getNombreUsuario());
    return CuentaRespuesta.de(cuenta);
  }
}
