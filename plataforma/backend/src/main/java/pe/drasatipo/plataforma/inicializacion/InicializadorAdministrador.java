package pe.drasatipo.plataforma.inicializacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import pe.drasatipo.plataforma.usuarios.Rol;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Procedimiento de inicialización (RF09). Los catálogos de roles, permisos, áreas y tipos de
 * documento se cargan con Flyway (V3). Este componente crea la primera cuenta de Administrador al
 * arrancar, solo si todavía no existe ninguna.
 *
 * <p>La contraseña inicial es temporal: el Administrador debe cambiarla en su primer inicio de
 * sesión (RF03).
 */
@Component
public class InicializadorAdministrador implements ApplicationRunner {

  static final int LONGITUD_MINIMA = 8;
  static final int LONGITUD_MAXIMA = 20;

  private static final Logger log = LoggerFactory.getLogger(InicializadorAdministrador.class);

  private final InicializacionProperties propiedades;
  private final RolRepository roles;
  private final UsuarioRepository usuarios;
  private final PasswordEncoder codificador;

  public InicializadorAdministrador(
      InicializacionProperties propiedades,
      RolRepository roles,
      UsuarioRepository usuarios,
      PasswordEncoder codificador) {
    this.propiedades = propiedades;
    this.roles = roles;
    this.usuarios = usuarios;
    this.codificador = codificador;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (usuarios.existsByRolCodigo(Rol.ADMINISTRADOR)) {
      log.info("Inicialización: ya existe una cuenta de Administrador; no se crea otra.");
      return;
    }
    String contrasena = propiedades.adminContrasena();
    if (!StringUtils.hasText(contrasena)) {
      log.warn(
          "Inicialización: no hay ninguna cuenta de Administrador. Define"
              + " PLATAFORMA_ADMIN_CONTRASENA y reinicia el backend para crearla.");
      return;
    }
    if (contrasena.length() < LONGITUD_MINIMA || contrasena.length() > LONGITUD_MAXIMA) {
      throw new IllegalStateException(
          "PLATAFORMA_ADMIN_CONTRASENA debe tener entre %d y %d caracteres (RNF02)."
              .formatted(LONGITUD_MINIMA, LONGITUD_MAXIMA));
    }

    Rol administrador =
        roles
            .findByCodigo(Rol.ADMINISTRADOR)
            .orElseThrow(() -> new IllegalStateException("Falta el rol ADMINISTRADOR (V3)."));
    Usuario cuenta =
        new Usuario(
            propiedades.adminUsuario(),
            propiedades.adminNombre(),
            codificador.encode(contrasena),
            administrador,
            true);
    usuarios.save(cuenta);
    log.info(
        "Inicialización: se creó la cuenta de Administrador '{}'. Debe cambiar la contraseña en"
            + " su primer inicio de sesión.",
        cuenta.getNombreUsuario());
  }
}
