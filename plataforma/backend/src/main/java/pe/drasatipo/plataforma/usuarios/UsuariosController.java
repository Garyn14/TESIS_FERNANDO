package pe.drasatipo.plataforma.usuarios;

import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestión de cuentas (HU01, HU02). No hay ruta para eliminar cuentas (RF01). Exige el permiso
 * USUARIOS_GESTIONAR (RF04).
 */
@RestController
@RequestMapping("/api")
@PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
public class UsuariosController {

  private final GestionUsuarios gestion;
  private final GestionContrasenas contrasenas;

  public UsuariosController(GestionUsuarios gestion, GestionContrasenas contrasenas) {
    this.gestion = gestion;
    this.contrasenas = contrasenas;
  }

  @GetMapping("/usuarios")
  public List<CuentaRespuesta> listar() {
    return gestion.listar();
  }

  @PostMapping("/usuarios")
  public ResponseEntity<CuentaRespuesta> crear(
      @RequestBody NuevaCuentaSolicitud solicitud, Authentication autenticacion) {
    CuentaRespuesta cuenta = gestion.crear(solicitud, autenticacion.getName());
    return ResponseEntity.created(URI.create("/api/usuarios/" + cuenta.id())).body(cuenta);
  }

  @PutMapping("/usuarios/{id}")
  public CuentaRespuesta editar(
      @PathVariable Long id,
      @RequestBody EdicionCuentaSolicitud solicitud,
      Authentication autenticacion) {
    return gestion.editar(id, solicitud, autenticacion.getName());
  }

  @PostMapping("/usuarios/{id}/desactivar")
  public CuentaRespuesta desactivar(@PathVariable Long id, Authentication autenticacion) {
    return gestion.desactivar(id, autenticacion.getName());
  }

  @PostMapping("/usuarios/{id}/reactivar")
  public CuentaRespuesta reactivar(@PathVariable Long id, Authentication autenticacion) {
    return gestion.reactivar(id, autenticacion.getName());
  }

  /** HU04: asigna una contraseña temporal. La respuesta nunca la incluye. */
  @PostMapping("/usuarios/{id}/restablecer-contrasena")
  public CuentaRespuesta restablecerContrasena(
      @PathVariable Long id,
      @RequestBody RestablecimientoSolicitud solicitud,
      Authentication autenticacion) {
    return contrasenas.restablecer(id, solicitud, autenticacion.getName());
  }

  /** Roles que se pueden asignar en el formulario de la cuenta. */
  @GetMapping("/roles")
  public List<RolRespuesta> roles() {
    return gestion.roles();
  }
}
