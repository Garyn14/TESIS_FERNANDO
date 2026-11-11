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
import pe.drasatipo.plataforma.areas.TipoDocumentoRespuesta;

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

  /** DRA-60: vista previa de la corrección, con el tipo del propio documento. */
  @PostMapping("/{codigo}/correccion/vista-previa")
  @PreAuthorize("hasAuthority('DOCUMENTO_CORREGIR')")
  public VistaPreviaRespuesta vistaPreviaCorreccion(
      @PathVariable String codigo,
      @RequestBody SolicitudDocumento solicitud,
      Authentication sesion) {
    return registro.vistaPreviaCorreccion(sesion.getName(), codigo, solicitud);
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

  /** HU30: vista previa de la reemisión de un documento firmado, sin guardar nada. */
  @PostMapping("/{codigo}/reemision/vista-previa")
  @PreAuthorize("hasAuthority('DOCUMENTO_REEMITIR')")
  public VistaPreviaRespuesta vistaPreviaReemision(
      @PathVariable String codigo,
      @RequestBody SolicitudReemision solicitud,
      Authentication sesion) {
    return registro.vistaPreviaReemision(sesion.getName(), codigo, solicitud.comoSolicitud());
  }

  /** HU30: reemite un documento firmado con los datos corregidos y el motivo. */
  @PostMapping("/{codigo}/reemision")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('DOCUMENTO_REEMITIR')")
  public DocumentoRespuesta reemitir(
      @PathVariable String codigo,
      @RequestBody SolicitudReemision solicitud,
      Authentication sesion) {
    return registro.reemitir(
        sesion.getName(), codigo, solicitud.comoSolicitud(), solicitud.motivo());
  }

  @GetMapping("/{codigo}")
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_AREA')")
  public DocumentoRespuesta detalle(@PathVariable String codigo, Authentication sesion) {
    return registro.detalle(sesion.getName(), codigo);
  }

  /** DRA-60: el formulario del tipo del documento, para corregirlo o reemitirlo. */
  @GetMapping("/{codigo}/formulario")
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_AREA')")
  public TipoDocumentoRespuesta formulario(@PathVariable String codigo, Authentication sesion) {
    return registro.formulario(sesion.getName(), codigo);
  }
}
