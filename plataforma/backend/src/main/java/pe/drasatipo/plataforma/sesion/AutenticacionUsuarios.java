package pe.drasatipo.plataforma.sesion;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.EventoCuenta;
import pe.drasatipo.plataforma.usuarios.HistorialRepository;
import pe.drasatipo.plataforma.usuarios.RegistroHistorial;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Verificación de usuario y contraseña (RF02) con bloqueo tras tres intentos fallidos seguidos
 * durante una hora (RNF02).
 */
@Service
public class AutenticacionUsuarios {

  static final int INTENTOS_MAXIMOS = 3;
  static final Duration DURACION_BLOQUEO = Duration.ofHours(1);
  static final String CREDENCIALES_INCORRECTAS = "Usuario o contraseña incorrectos.";
  static final String CUENTA_DESACTIVADA =
      "Su cuenta está desactivada. Comuníquese con el Administrador.";

  private static final ZoneId ZONA = ZoneId.of("America/Lima");
  private static final DateTimeFormatter HORA =
      DateTimeFormatter.ofPattern("h:mm a", Locale.forLanguageTag("es-PE"));
  private static final Logger log = LoggerFactory.getLogger(AutenticacionUsuarios.class);

  private final UsuarioRepository usuarios;
  private final HistorialRepository historial;
  private final RolRepository roles;
  private final PasswordEncoder codificador;
  private final String hashFicticio;

  public AutenticacionUsuarios(
      UsuarioRepository usuarios,
      HistorialRepository historial,
      RolRepository roles,
      PasswordEncoder codificador) {
    this.usuarios = usuarios;
    this.historial = historial;
    this.roles = roles;
    this.codificador = codificador;
    this.hashFicticio = codificador.encode("contrasena-ficticia-para-igualar-tiempos");
  }

  /** Resultado de un inicio de sesión correcto, armado dentro de la transacción. */
  public record CuentaAutenticada(UsuarioEnSesion identidad, SesionRespuesta sesion) {}

  /**
   * Devuelve la identidad y los datos de sesión si el usuario y la contraseña son correctos. Los
   * fallos lanzan {@link ReglaDeNegocioException} sin deshacer la transacción, para que el contador
   * de intentos se guarde.
   */
  @Transactional(noRollbackFor = ReglaDeNegocioException.class)
  public CuentaAutenticada autenticar(String nombreUsuario, String contrasena) {
    OffsetDateTime ahora = OffsetDateTime.now();
    Usuario cuenta = usuarios.findByNombreUsuarioIgnoreCase(nombreUsuario.strip()).orElse(null);
    if (cuenta == null) {
      // Se calcula un hash igual, para que la respuesta tarde lo mismo y no revele si existe.
      codificador.matches(contrasena, hashFicticio);
      throw credencialesIncorrectas();
    }
    if (cuenta.estaBloqueada(ahora)) {
      throw bloqueada(cuenta);
    }
    if (!codificador.matches(contrasena, cuenta.getContrasenaHash())) {
      if (cuenta.registrarIntentoFallido(INTENTOS_MAXIMOS, ahora.plus(DURACION_BLOQUEO))) {
        String detalle =
            "%d intentos fallidos seguidos; bloqueada hasta las %s"
                .formatted(INTENTOS_MAXIMOS, hora(cuenta.getBloqueadaHasta()));
        historial.save(
            new RegistroHistorial(cuenta.getId(), EventoCuenta.BLOQUEADA, detalle, null));
        log.warn("Cuenta '{}' bloqueada: {}.", cuenta.getNombreUsuario(), detalle);
        throw bloqueada(cuenta);
      }
      throw credencialesIncorrectas();
    }
    // Solo con la contraseña correcta se revela que la cuenta está desactivada.
    if (!cuenta.isActivo()) {
      throw new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, CUENTA_DESACTIVADA);
    }
    cuenta.registrarIngresoCorrecto();
    return new CuentaAutenticada(
        new UsuarioEnSesion(cuenta.getId(), cuenta.getNombreUsuario()),
        SesionRespuesta.de(cuenta, roles.codigosDePermisos(cuenta.getRol().getId())));
  }

  private static ReglaDeNegocioException credencialesIncorrectas() {
    return new ReglaDeNegocioException(HttpStatus.UNAUTHORIZED, null, CREDENCIALES_INCORRECTAS);
  }

  private static ReglaDeNegocioException bloqueada(Usuario cuenta) {
    return new ReglaDeNegocioException(
        HttpStatus.LOCKED,
        null,
        "Su cuenta está bloqueada por %d intentos fallidos. Intente nuevamente a las %s o pida al Administrador que restablezca su contraseña."
            .formatted(INTENTOS_MAXIMOS, hora(cuenta.getBloqueadaHasta())));
  }

  private static String hora(OffsetDateTime momento) {
    return HORA.format(momento.atZoneSameInstant(ZONA));
  }
}
