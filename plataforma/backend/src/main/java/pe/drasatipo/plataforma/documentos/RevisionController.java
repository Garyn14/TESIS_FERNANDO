package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

  public record MotivoSolicitud(String motivo) {}

  /** Observación de un documento (HU13): vuelve al Área encargada con el motivo. */
  @PostMapping("/documentos/{codigo}/observacion")
  @PreAuthorize("hasAuthority('DOCUMENTO_OBSERVAR')")
  public DocumentoRespuesta observarDocumento(
      @PathVariable String codigo, @RequestBody MotivoSolicitud solicitud, Authentication sesion) {
    return revision.decidirEnDocumento(
        sesion.getName(), codigo, solicitud.motivo(), EstadoDocumento.OBSERVADO);
  }

  /** Rechazo de un documento (HU14): es definitivo. */
  @PostMapping("/documentos/{codigo}/rechazo")
  @PreAuthorize("hasAuthority('DOCUMENTO_RECHAZAR')")
  public DocumentoRespuesta rechazarDocumento(
      @PathVariable String codigo, @RequestBody MotivoSolicitud solicitud, Authentication sesion) {
    return revision.decidirEnDocumento(
        sesion.getName(), codigo, solicitud.motivo(), EstadoDocumento.RECHAZADO);
  }

  /** Observación o rechazo de certificados de un lote (HU12): sin códigos, todo el lote. */
  public record DecisionSolicitud(List<String> codigos, String motivo) {}

  @PostMapping("/lotes/{numero}/observacion")
  @PreAuthorize("hasAuthority('DOCUMENTO_OBSERVAR')")
  public LoteRespuesta observarEnLote(
      @PathVariable String numero,
      @RequestBody DecisionSolicitud solicitud,
      Authentication sesion) {
    return revision.decidirEnLote(
        sesion.getName(),
        numero,
        solicitud.codigos(),
        solicitud.motivo(),
        EstadoDocumento.OBSERVADO);
  }

  @PostMapping("/lotes/{numero}/rechazo")
  @PreAuthorize("hasAuthority('DOCUMENTO_RECHAZAR')")
  public LoteRespuesta rechazarEnLote(
      @PathVariable String numero,
      @RequestBody DecisionSolicitud solicitud,
      Authentication sesion) {
    return revision.decidirEnLote(
        sesion.getName(),
        numero,
        solicitud.codigos(),
        solicitud.motivo(),
        EstadoDocumento.RECHAZADO);
  }

  /** Muestra del PDF final (HU16), para ver cómo se imprimirá. No se guarda ni se registra. */
  @GetMapping("/documentos/{codigo}/pdf")
  public ResponseEntity<byte[]> muestraDelPdf(@PathVariable String codigo) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename(codigo + "-muestra.pdf").build().toString())
        .body(revision.muestraDelPdf(codigo).contenido());
  }
}
