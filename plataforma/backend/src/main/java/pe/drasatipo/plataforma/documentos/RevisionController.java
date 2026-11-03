package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Bandeja "Por revisar" del Director (HU10). Abrir un elemento usa POST porque registra la revisión
 * (RF22).
 */
@RestController
@RequestMapping("/api/revision")
@PreAuthorize("hasAuthority('DOCUMENTO_REVISAR')")
public class RevisionController {

  private final RevisionDelDirector revision;

  public RevisionController(RevisionDelDirector revision) {
    this.revision = revision;
  }

  @GetMapping
  public List<ElementoPorRevisar> bandeja() {
    return revision.bandeja();
  }

  @PostMapping("/documentos/{codigo}")
  public DocumentoRespuesta revisarDocumento(@PathVariable String codigo, Authentication sesion) {
    return revision.revisarDocumento(sesion.getName(), codigo);
  }

  @PostMapping("/lotes/{numero}")
  public LoteRespuesta revisarLote(@PathVariable String numero, Authentication sesion) {
    return revision.revisarLote(sesion.getName(), numero);
  }
}
