package pe.drasatipo.plataforma.billeteras;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.crypto.Keys;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.CambioDeRol;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.EventoCuenta;
import pe.drasatipo.plataforma.usuarios.HistorialRepository;
import pe.drasatipo.plataforma.usuarios.RegistroHistorial;
import pe.drasatipo.plataforma.usuarios.Rol;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Billetera del director (RF07) y su rol de firmante (RF08). El estado de firmante se lee siempre
 * del contrato (RNF10); el backend no envía transacciones ni conoce claves (RNF05).
 */
@Service
public class GestionBilleteras {

  static final String FORMATO =
      "La dirección debe empezar con 0x y tener 40 caracteres hexadecimales.";
  static final String SUMA_VERIFICACION =
      "La dirección tiene un error de tipeo: no coincide su suma de verificación (EIP-55)."
          + " Cópiela de nuevo desde la billetera.";
  static final String DUPLICADA = "Esa billetera ya está asignada a otra cuenta.";
  static final String SOLO_DIRECTOR = "Solo una cuenta con rol Director puede tener billetera.";
  static final String ES_ADMINISTRADORA =
      "Esa billetera es administradora del contrato. El director debe usar una billetera"
          + " distinta.";
  static final String REVOCAR_ANTES =
      "La billetera actual tiene el rol de firmante. Revóquelo antes de cambiar la billetera.";
  static final String SIN_BILLETERA = "La cuenta no tiene billetera registrada.";
  static final String TRANSACCION_INVALIDA =
      "La transacción no se encontró, no se confirmó o no cambió el rol de firmante en el"
          + " contrato de la plataforma.";
  static final String OTRA_BILLETERA = "La transacción corresponde a otra billetera.";

  private static final Pattern DIRECCION = Pattern.compile("^0x[0-9a-fA-F]{40}$");
  private static final Pattern TRANSACCION = Pattern.compile("^0x[0-9a-fA-F]{64}$");
  private static final Logger log = LoggerFactory.getLogger(GestionBilleteras.class);

  private final UsuarioRepository usuarios;
  private final HistorialRepository historial;
  private final ContratoRegistro contrato;

  public GestionBilleteras(
      UsuarioRepository usuarios, HistorialRepository historial, ContratoRegistro contrato) {
    this.usuarios = usuarios;
    this.historial = historial;
    this.contrato = contrato;
  }

  /** Cuentas con rol Director o con billetera, y su estado de firmante en el contrato. */
  @Transactional(readOnly = true)
  public BilleterasRespuesta listar() {
    List<CuentaConBilletera> cuentas = new ArrayList<>();
    String aviso = null;
    for (Usuario u : usuarios.directoresYCuentasConBilletera()) {
      Boolean firmante = null;
      if (u.getBilletera() != null && aviso == null) {
        try {
          firmante = contrato.esFirmante(u.getBilletera());
        } catch (BlockchainNoDisponibleException e) {
          aviso = e.getMessage();
        }
      }
      cuentas.add(
          new CuentaConBilletera(
              u.getId(),
              u.getNombreUsuario(),
              u.getNombreCompleto(),
              u.getRol().getCodigo(),
              u.getRol().getNombre(),
              u.isActivo(),
              u.getBilletera(),
              aviso == null ? firmante : null));
    }
    if (aviso != null) {
      // Si falló a mitad de la lista, ningún estado se muestra como cierto.
      cuentas.replaceAll(c ->
          new CuentaConBilletera(
              c.id(),
              c.nombreUsuario(),
              c.nombreCompleto(),
              c.rol(),
              c.rolNombre(),
              c.activo(),
              c.billetera(),
              null));
    }
    return new BilleterasRespuesta(aviso == null, aviso, cuentas);
  }

  /** HU06 (RF07): registra o cambia la billetera del director. */
  @Transactional
  public CuentaConBilletera registrar(Long idCuenta, String direccion, String nombreUsuarioActor) {
    String billetera = normalizar(direccion);
    Usuario cuenta = cuenta(idCuenta);
    if (!Rol.DIRECTOR.equals(cuenta.getRol().getCodigo())) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "direccion", SOLO_DIRECTOR);
    }
    if (billetera.equalsIgnoreCase(String.valueOf(cuenta.getBilletera()))) {
      return vista(cuenta, consultarFirmante(billetera));
    }
    Optional<Usuario> otra = usuarios.findByBilleteraIgnoreCase(billetera);
    if (otra.isPresent() && !otra.get().getId().equals(cuenta.getId())) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "direccion", DUPLICADA);
    }
    try {
      if (contrato.esAdministrador(billetera)) {
        throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "direccion", ES_ADMINISTRADORA);
      }
      if (cuenta.getBilletera() != null && contrato.esFirmante(cuenta.getBilletera())) {
        throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "direccion", REVOCAR_ANTES);
      }
    } catch (BlockchainNoDisponibleException e) {
      // Sin la blockchain no se pueden comprobar las dos reglas anteriores: no se cambia nada.
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }

    String anterior = cuenta.getBilletera();
    cuenta.asignarBilletera(billetera);
    usuarios.flush();
    registrar(
        cuenta,
        EventoCuenta.BILLETERA_REGISTRADA,
        anterior == null
            ? "Billetera: " + billetera
            : "Billetera: %s → %s".formatted(anterior, billetera),
        nombreUsuarioActor);
    return vista(cuenta, consultarFirmante(billetera));
  }

  /**
   * HU06 (RF08): el navegador avisa que la billetera del Administrador firmó un otorgamiento o una
   * revocación. Se verifica en la blockchain antes de registrarlo en el historial.
   */
  @Transactional
  public CuentaConBilletera confirmarCambioDeRol(
      Long idCuenta, String transaccion, String nombreUsuarioActor) {
    if (transaccion == null || !TRANSACCION.matcher(transaccion).matches()) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, "transaccion", TRANSACCION_INVALIDA);
    }
    Usuario cuenta = cuenta(idCuenta);
    if (cuenta.getBilletera() == null) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, SIN_BILLETERA);
    }
    CambioDeRol cambio;
    boolean firmante;
    try {
      cambio =
          contrato
              .cambioDeRolEn(transaccion)
              .orElseThrow(() ->
                  new ReglaDeNegocioException(
                      HttpStatus.CONFLICT, "transaccion", TRANSACCION_INVALIDA));
      firmante = contrato.esFirmante(cuenta.getBilletera());
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
    if (!cambio.cuenta().equalsIgnoreCase(cuenta.getBilletera())) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "transaccion", OTRA_BILLETERA);
    }
    // La misma transacción no se registra dos veces (RNF10).
    if (!historial.existsByUsuarioIdAndDetalleContaining(cuenta.getId(), transaccion)) {
      registrar(
          cuenta,
          cambio.otorgado() ? EventoCuenta.FIRMANTE_OTORGADO : EventoCuenta.FIRMANTE_REVOCADO,
          "Billetera %s; transacción %s; bloque %d; firmada por %s"
              .formatted(cuenta.getBilletera(), transaccion, cambio.bloque(), cambio.emisor()),
          nombreUsuarioActor);
    }
    return vista(cuenta, firmante);
  }

  /** Valida el formato y, si trae mayúsculas, la suma de verificación EIP-55. */
  static String normalizar(String direccion) {
    String valor = direccion == null ? "" : direccion.strip();
    if (!DIRECCION.matcher(valor).matches()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "direccion", FORMATO);
    }
    String hex = valor.substring(2);
    boolean sinMayusculas = hex.equals(hex.toLowerCase());
    boolean sinMinusculas = hex.equals(hex.toUpperCase());
    String conSuma = Keys.toChecksumAddress(valor.toLowerCase());
    if (!sinMayusculas && !sinMinusculas && !conSuma.equals(valor)) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "direccion", SUMA_VERIFICACION);
    }
    return conSuma;
  }

  private Boolean consultarFirmante(String billetera) {
    try {
      return contrato.esFirmante(billetera);
    } catch (BlockchainNoDisponibleException e) {
      return null;
    }
  }

  private void registrar(
      Usuario cuenta, EventoCuenta evento, String detalle, String nombreUsuarioActor) {
    Usuario actor = usuarios.findByNombreUsuarioIgnoreCase(nombreUsuarioActor).orElseThrow();
    historial.save(new RegistroHistorial(cuenta.getId(), evento, detalle, actor.getId()));
    log.info("Cuenta '{}': {} ({}).", cuenta.getNombreUsuario(), evento, detalle);
  }

  private Usuario cuenta(Long id) {
    return usuarios
        .findConRolById(id)
        .orElseThrow(
            () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, "La cuenta no existe."));
  }

  private static CuentaConBilletera vista(Usuario u, Boolean firmante) {
    return new CuentaConBilletera(
        u.getId(),
        u.getNombreUsuario(),
        u.getNombreCompleto(),
        u.getRol().getCodigo(),
        u.getRol().getNombre(),
        u.isActivo(),
        u.getBilletera(),
        firmante);
  }
}
