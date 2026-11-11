package pe.drasatipo.plataforma.catalogo;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Pantalla "Áreas y documentos" (DRA-60, DRA-61). No hay operación para eliminar un área. Solo el
 * Administrador: CATALOGO_GESTIONAR (RF04).
 */
@RestController
@RequestMapping("/api/catalogo")
@PreAuthorize("hasAuthority('CATALOGO_GESTIONAR')")
public class CatalogoController {

  private final GestionCatalogo catalogo;
  private final UsuarioRepository usuarios;

  public CatalogoController(GestionCatalogo catalogo, UsuarioRepository usuarios) {
    this.catalogo = catalogo;
    this.usuarios = usuarios;
  }

  @GetMapping
  public CatalogoRespuesta consultar() {
    return catalogo.consultar();
  }

  @PutMapping("/areas/{area}/tipos-documento/{tipo}")
  public CatalogoRespuesta asignar(
      @PathVariable String area, @PathVariable String tipo, Authentication sesion) {
    return catalogo.asignar(area, tipo, actor(sesion));
  }

  @DeleteMapping("/areas/{area}/tipos-documento/{tipo}")
  public CatalogoRespuesta quitar(
      @PathVariable String area, @PathVariable String tipo, Authentication sesion) {
    return catalogo.quitar(area, tipo, actor(sesion));
  }

  @PostMapping("/areas")
  public CatalogoRespuesta crearArea(
      @RequestBody CatalogoRespuesta.SolicitudArea solicitud, Authentication sesion) {
    return catalogo.crearArea(solicitud.nombre(), actor(sesion));
  }

  @PutMapping("/areas/{area}")
  public CatalogoRespuesta renombrarArea(
      @PathVariable String area,
      @RequestBody CatalogoRespuesta.SolicitudArea solicitud,
      Authentication sesion) {
    return catalogo.renombrarArea(area, solicitud.nombre(), actor(sesion));
  }

  @PostMapping("/areas/{area}/deshabilitar")
  public CatalogoRespuesta deshabilitarArea(@PathVariable String area, Authentication sesion) {
    return catalogo.deshabilitarArea(area, actor(sesion));
  }

  @PostMapping("/areas/{area}/reactivar")
  public CatalogoRespuesta reactivarArea(@PathVariable String area, Authentication sesion) {
    return catalogo.reactivarArea(area, actor(sesion));
  }

  @PutMapping("/tipos-documento/{tipo}/vigencia")
  public CatalogoRespuesta cambiarVigencia(
      @PathVariable String tipo,
      @RequestBody CatalogoRespuesta.SolicitudVigencia solicitud,
      Authentication sesion) {
    return catalogo.cambiarVigencia(tipo, solicitud.meses(), actor(sesion));
  }

  private long actor(Authentication sesion) {
    return usuarios.findByNombreUsuarioIgnoreCase(sesion.getName()).orElseThrow().getId();
  }
}
