package pe.drasatipo.plataforma.usuarios;

import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Gestión de cuentas (HU01). Exige el permiso USUARIOS_GESTIONAR (RF04). */
@RestController
@RequestMapping("/api")
@PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
public class UsuariosController {

  private final GestionUsuarios gestion;

  public UsuariosController(GestionUsuarios gestion) {
    this.gestion = gestion;
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

  /** Roles que se pueden asignar en el formulario de la cuenta. */
  @GetMapping("/roles")
  public List<RolRespuesta> roles() {
    return gestion.roles();
  }
}
