package pe.drasatipo.plataforma.avisos;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Los avisos de la persona en la plataforma (HU26–HU28). */
@RestController
@RequestMapping("/api/avisos")
@PreAuthorize("hasAuthority('NOTIFICACIONES_VER')")
public class AvisosController {

  private final Avisos avisos;

  public AvisosController(Avisos avisos) {
    this.avisos = avisos;
  }

  @GetMapping
  public AvisosRespuesta mios(Authentication sesion) {
    return avisos.de(sesion.getName());
  }

  @PostMapping("/{id}/lectura")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void leido(@PathVariable long id, Authentication sesion) {
    avisos.marcarLeido(sesion.getName(), id);
  }

  @PostMapping("/lectura")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void todosLeidos(Authentication sesion) {
    avisos.marcarTodos(sesion.getName());
  }
}
