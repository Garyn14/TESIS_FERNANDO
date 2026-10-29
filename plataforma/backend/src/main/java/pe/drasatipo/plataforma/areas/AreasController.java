package pe.drasatipo.plataforma.areas;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** Áreas y tipos de documento (HU05, RF05, RF06). */
@RestController
@RequestMapping("/api")
public class AreasController {

  private final AreaRepository areas;
  private final UsuarioRepository usuarios;
  private final AlcanceDeArea alcance;

  public AreasController(AreaRepository areas, UsuarioRepository usuarios, AlcanceDeArea alcance) {
    this.areas = areas;
    this.usuarios = usuarios;
    this.alcance = alcance;
  }

  /** Áreas activas con sus tipos de documento, para asignarlas en el formulario de cuentas. */
  @GetMapping("/areas")
  @PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
  @Transactional(readOnly = true)
  public List<AreaRespuesta> listar() {
    return areas.findByActivaTrueOrderByNombre().stream().map(AreaRespuesta::de).toList();
  }

  /** Tipos de documento que la cuenta en sesión puede registrar, según la regla de RF05. */
  @GetMapping("/tipos-documento")
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  @Transactional(readOnly = true)
  public List<TipoDocumentoRespuesta> tiposPermitidos(Authentication sesion) {
    Usuario cuenta = usuarios.findByNombreUsuarioIgnoreCase(sesion.getName()).orElseThrow();
    return alcance.tiposPermitidos(cuenta).stream().map(TipoDocumentoRespuesta::de).toList();
  }
}
