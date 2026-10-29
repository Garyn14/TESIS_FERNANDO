package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;

/** Gestión de cuentas por el Administrador (RF01). */
@Service
public class GestionUsuarios {

  static final String USUARIO_DUPLICADO = "El nombre de usuario ya está registrado.";

  private static final Logger log = LoggerFactory.getLogger(GestionUsuarios.class);

  private final UsuarioRepository usuarios;
  private final RolRepository roles;
  private final PasswordEncoder codificador;
  private final Validator validador;

  public GestionUsuarios(
      UsuarioRepository usuarios,
      RolRepository roles,
      PasswordEncoder codificador,
      Validator validador) {
    this.usuarios = usuarios;
    this.roles = roles;
    this.codificador = codificador;
    this.validador = validador;
  }

  @Transactional(readOnly = true)
  public List<CuentaRespuesta> listar() {
    return usuarios.findAllByOrderByCreadoEnDesc().stream().map(CuentaRespuesta::de).toList();
  }

  @Transactional(readOnly = true)
  public List<RolRespuesta> roles() {
    return roles.findAll().stream().map(RolRespuesta::de).toList();
  }

  /**
   * HU01: crea una cuenta activa, con un único rol y contraseña temporal (RF03). El nombre de
   * usuario se normaliza a minúsculas antes de validar, así "JPerez" y "jperez" son el mismo.
   */
  @Transactional
  public CuentaRespuesta crear(NuevaCuentaSolicitud solicitud, String creadoPorNombreUsuario) {
    NuevaCuentaSolicitud datos = solicitud.normalizada();
    validar(datos);

    Rol rol =
        roles
            .findByCodigo(datos.rol())
            .orElseThrow(
                () ->
                    new ReglaDeNegocioException(
                        HttpStatus.BAD_REQUEST, "rol", "Seleccione un rol válido."));
    if (usuarios.existsByNombreUsuarioIgnoreCase(datos.nombreUsuario())) {
      throw duplicado();
    }
    Usuario creador =
        usuarios
            .findByNombreUsuarioIgnoreCase(creadoPorNombreUsuario)
            .orElseThrow(() -> new IllegalStateException("La cuenta en sesión no existe."));

    Usuario cuenta =
        new Usuario(
            datos.nombreUsuario(),
            datos.nombreCompleto(),
            codificador.encode(datos.contrasenaTemporal()),
            rol,
            true,
            creador.getId());
    try {
      usuarios.saveAndFlush(cuenta);
    } catch (DataIntegrityViolationException e) {
      // Otra solicitud creó el mismo nombre de usuario entre la verificación y el guardado.
      throw duplicado();
    }
    log.info(
        "Cuenta '{}' creada con el rol {} por '{}'.",
        cuenta.getNombreUsuario(),
        rol.getCodigo(),
        creador.getNombreUsuario());
    return CuentaRespuesta.de(cuenta);
  }

  /** Se valida después de normalizar, por eso no se usa @Valid en el controlador. */
  private void validar(NuevaCuentaSolicitud datos) {
    Set<ConstraintViolation<NuevaCuentaSolicitud>> errores = validador.validate(datos);
    if (errores.isEmpty()) {
      return;
    }
    // Un campo vacío incumple varias reglas a la vez: se muestra primero "Ingrese...".
    Map<String, String> campos = new TreeMap<>();
    for (ConstraintViolation<NuevaCuentaSolicitud> error : errores) {
      String campo = error.getPropertyPath().toString();
      boolean vacio = error.getConstraintDescriptor().getAnnotation() instanceof NotBlank;
      if (vacio || !campos.containsKey(campo)) {
        campos.put(campo, error.getMessage());
      }
    }
    throw new DatosInvalidosException(campos);
  }

  private static ReglaDeNegocioException duplicado() {
    return new ReglaDeNegocioException(HttpStatus.CONFLICT, "nombreUsuario", USUARIO_DUPLICADO);
  }
}
