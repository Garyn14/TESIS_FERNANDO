package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Documentos del Área encargada (HU08). No hay rutas para modificar ni eliminar un documento
 * enviado (RF20).
 */
@RestController
@RequestMapping("/api/documentos")
public class DocumentosController {

  private final RegistroDeDocumentos registro;

  public DocumentosController(RegistroDeDocumentos registro) {
    this.registro = registro;
  }

  @PostMapping("/vista-previa")
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public VistaPreviaRespuesta vistaPrevia(
      @RequestBody SolicitudDocumento solicitud, Authentication sesion) {
    return registro.vistaPrevia(sesion.getName(), solicitud);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public DocumentoRespuesta registrar(
      @RequestBody SolicitudDocumento solicitud, Authentication sesion) {
    return registro.registrar(sesion.getName(), solicitud);
  }

  @GetMapping
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_AREA')")
  public List<DocumentoResumen> delArea(Authentication sesion) {
    return registro.delArea(sesion.getName());
  }

  /** HU15: corrige un documento observado y lo reenvía a revisión. */
  @PostMapping("/{codigo}/correccion")
  @PreAuthorize("hasAuthority('DOCUMENTO_CORREGIR')")
  public DocumentoRespuesta corregir(
      @PathVariable String codigo,
      @RequestBody SolicitudDocumento solicitud,
      Authentication sesion) {
    return registro.corregir(sesion.getName(), codigo, solicitud);
  }

  @GetMapping("/{codigo}")
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_AREA')")
  public DocumentoRespuesta detalle(@PathVariable String codigo, Authentication sesion) {
    return registro.detalle(sesion.getName(), codigo);
  }
}
