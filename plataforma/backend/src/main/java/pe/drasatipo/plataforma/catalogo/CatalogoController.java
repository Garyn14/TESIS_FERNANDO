package pe.drasatipo.plataforma.catalogo;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** Pantalla "Áreas y documentos" (DRA-60). Solo el Administrador: CATALOGO_GESTIONAR (RF04). */
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

  private long actor(Authentication sesion) {
    return usuarios.findByNombreUsuarioIgnoreCase(sesion.getName()).orElseThrow().getId();
  }
}
