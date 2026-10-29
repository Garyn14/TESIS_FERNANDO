package pe.drasatipo.plataforma.usuarios;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
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

/** Gestión de cuentas por el Administrador (RF01): HU01 y HU02. */
@Service
public class GestionUsuarios {

  static final String USUARIO_DUPLICADO = "El nombre de usuario ya está registrado.";
  static final String CUENTA_INEXISTENTE = "La cuenta no existe.";
  static final String ROL_PROPIO = "No puede cambiar su propio rol.";
  static final String DESACTIVACION_PROPIA = "No puede desactivar su propia cuenta.";
  static final String ULTIMO_ADMINISTRADOR = "Debe quedar al menos un Administrador activo.";

  private static final Logger log = LoggerFactory.getLogger(GestionUsuarios.class);

  private final UsuarioRepository usuarios;
  private final RolRepository roles;
  private final HistorialRepository historial;
  private final PasswordEncoder codificador;
  private final Validator validador;

  public GestionUsuarios(
      UsuarioRepository usuarios,
      RolRepository roles,
      HistorialRepository historial,
      PasswordEncoder codificador,
      Validator validador) {
    this.usuarios = usuarios;
    this.roles = roles;
    this.historial = historial;
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
  public CuentaRespuesta crear(NuevaCuentaSolicitud solicitud, String nombreUsuarioActor) {
    NuevaCuentaSolicitud datos = solicitud.normalizada();
    validar(datos);

    Rol rol = rolValido(datos.rol());
    if (usuarios.existsByNombreUsuarioIgnoreCase(datos.nombreUsuario())) {
      throw duplicado();
    }
    Usuario actor = actor(nombreUsuarioActor);

    Usuario cuenta =
        new Usuario(
            datos.nombreUsuario(),
            datos.nombreCompleto(),
            codificador.encode(datos.contrasenaTemporal()),
            rol,
            true,
            actor.getId());
    try {
      usuarios.saveAndFlush(cuenta);
    } catch (DataIntegrityViolationException e) {
      // Otra solicitud creó el mismo nombre de usuario entre la verificación y el guardado.
      throw duplicado();
    }
    registrar(cuenta, EventoCuenta.CREADA, "Rol: " + rol.getNombre(), actor);
    return CuentaRespuesta.de(cuenta);
  }

  /** HU02: cambia el nombre completo y el rol. Si no cambia nada, no se registra ningún evento. */
  @Transactional
  public CuentaRespuesta editar(
      Long id, EdicionCuentaSolicitud solicitud, String nombreUsuarioActor) {
    EdicionCuentaSolicitud datos = solicitud.normalizada();
    validar(datos);
    Rol rol = rolValido(datos.rol());
    Usuario cuenta = cuenta(id);
    Usuario actor = actor(nombreUsuarioActor);

    List<String> cambios = new ArrayList<>();
    if (!cuenta.getNombreCompleto().equals(datos.nombreCompleto())) {
      cambios.add(
          "Nombre completo: %s → %s".formatted(cuenta.getNombreCompleto(), datos.nombreCompleto()));
    }
    boolean cambiaRol = !cuenta.getRol().getCodigo().equals(rol.getCodigo());
    if (cambiaRol) {
      if (cuenta.getId().equals(actor.getId())) {
        throw conflicto("rol", ROL_PROPIO);
      }
      exigirOtroAdministradorActivo(cuenta, "rol");
      cambios.add("Rol: %s → %s".formatted(cuenta.getRol().getNombre(), rol.getNombre()));
    }
    if (cambios.isEmpty()) {
      return CuentaRespuesta.de(cuenta);
    }

    cuenta.actualizar(datos.nombreCompleto(), rol);
    registrar(cuenta, EventoCuenta.EDITADA, String.join("; ", cambios), actor);
    return CuentaRespuesta.de(cuenta);
  }

  /**
   * HU02: quita el acceso sin borrar la cuenta ni su historial (RF01). Si ya estaba inactiva, no
   * hace nada.
   */
  @Transactional
  public CuentaRespuesta desactivar(Long id, String nombreUsuarioActor) {
    Usuario cuenta = cuenta(id);
    Usuario actor = actor(nombreUsuarioActor);
    if (!cuenta.isActivo()) {
      return CuentaRespuesta.de(cuenta);
    }
    if (cuenta.getId().equals(actor.getId())) {
      throw conflicto(null, DESACTIVACION_PROPIA);
    }
    exigirOtroAdministradorActivo(cuenta, null);

    cuenta.desactivar();
    registrar(cuenta, EventoCuenta.DESACTIVADA, null, actor);
    return CuentaRespuesta.de(cuenta);
  }

  /** HU02: devuelve el acceso con el mismo rol. Si ya estaba activa, no hace nada. */
  @Transactional
  public CuentaRespuesta reactivar(Long id, String nombreUsuarioActor) {
    Usuario cuenta = cuenta(id);
    Usuario actor = actor(nombreUsuarioActor);
    if (cuenta.isActivo()) {
      return CuentaRespuesta.de(cuenta);
    }
    cuenta.reactivar();
    registrar(cuenta, EventoCuenta.REACTIVADA, null, actor);
    return CuentaRespuesta.de(cuenta);
  }

  /** Si la cuenta es un Administrador activo, debe existir otro para poder quitarle ese rol. */
  private void exigirOtroAdministradorActivo(Usuario cuenta, String campo) {
    if (!cuenta.isActivo() || !Rol.ADMINISTRADOR.equals(cuenta.getRol().getCodigo())) {
      return;
    }
    if (usuarios.findByRolCodigoAndActivoTrue(Rol.ADMINISTRADOR).size() <= 1) {
      throw conflicto(campo, ULTIMO_ADMINISTRADOR);
    }
  }

  private void registrar(Usuario cuenta, EventoCuenta evento, String detalle, Usuario actor) {
    historial.save(new RegistroHistorial(cuenta.getId(), evento, detalle, actor.getId()));
    log.info(
        "Cuenta '{}': {} por '{}'{}.",
        cuenta.getNombreUsuario(),
        evento,
        actor.getNombreUsuario(),
        detalle == null ? "" : " (" + detalle + ")");
  }

  private Rol rolValido(String codigo) {
    return roles
        .findByCodigo(codigo)
        .orElseThrow(
            () ->
                new ReglaDeNegocioException(
                    HttpStatus.BAD_REQUEST, "rol", "Seleccione un rol válido."));
  }

  private Usuario cuenta(Long id) {
    return usuarios
        .findById(id)
        .orElseThrow(
            () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, CUENTA_INEXISTENTE));
  }

  private Usuario actor(String nombreUsuario) {
    return usuarios
        .findByNombreUsuarioIgnoreCase(nombreUsuario)
        .orElseThrow(() -> new IllegalStateException("La cuenta en sesión no existe."));
  }

  /** Se valida después de normalizar, por eso no se usa @Valid en el controlador. */
  private <T> void validar(T datos) {
    Set<ConstraintViolation<T>> errores = validador.validate(datos);
    if (errores.isEmpty()) {
      return;
    }
    // Un campo vacío incumple varias reglas a la vez: se muestra primero "Ingrese...".
    Map<String, String> campos = new TreeMap<>();
    for (ConstraintViolation<T> error : errores) {
      String campo = error.getPropertyPath().toString();
      boolean vacio = error.getConstraintDescriptor().getAnnotation() instanceof NotBlank;
      if (vacio || !campos.containsKey(campo)) {
        campos.put(campo, error.getMessage());
      }
    }
    throw new DatosInvalidosException(campos);
  }

  private static ReglaDeNegocioException conflicto(String campo, String mensaje) {
    return new ReglaDeNegocioException(HttpStatus.CONFLICT, campo, mensaje);
  }

  private static ReglaDeNegocioException duplicado() {
    return conflicto("nombreUsuario", USUARIO_DUPLICADO);
  }
}
