package pe.drasatipo.plataforma.areas;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** Áreas y tipos de documento (HU05, HU07, RF05, RF06, RF10). */
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
    return alcance.tiposPermitidos(cuenta(sesion)).stream()
        .map(TipoDocumentoRespuesta::de)
        .toList();
  }

  /**
   * Un tipo de documento que la cuenta puede registrar, para abrir su formulario (HU07). Si no es
   * de su área, no existe o está inactivo, la respuesta es la misma: no revela qué tipos existen.
   */
  @GetMapping("/tipos-documento/{codigo}")
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  @Transactional(readOnly = true)
  public TipoDocumentoRespuesta tipoPermitido(@PathVariable String codigo, Authentication sesion) {
    return alcance
        .tipoPermitido(cuenta(sesion), codigo)
        .map(TipoDocumentoRespuesta::de)
        .orElseThrow(
            () ->
                new ReglaDeNegocioException(
                    HttpStatus.FORBIDDEN,
                    null,
                    "Este tipo de documento no está asignado a su área."));
  }

  private Usuario cuenta(Authentication sesion) {
    return usuarios.findByNombreUsuarioIgnoreCase(sesion.getName()).orElseThrow();
  }
}
