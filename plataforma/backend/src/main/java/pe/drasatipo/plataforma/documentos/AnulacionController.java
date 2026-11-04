package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Documentos firmados y su anulación (HU29). La anulación se solicita con el motivo, la billetera
 * la registra en el contrato y se confirma con la transacción.
 */
@RestController
@RequestMapping("/api")
public class AnulacionController {

  private final AnulacionDeDocumentos anulacion;

  public AnulacionController(AnulacionDeDocumentos anulacion) {
    this.anulacion = anulacion;
  }

  public record SolicitudAnulacion(String motivo) {}

  public record ConfirmacionAnulacion(String transaccion) {}

  @GetMapping("/firmados")
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_FIRMADOS')")
  public List<DocumentoFirmado> firmados() {
    return anulacion.firmados();
  }

  @PostMapping("/anulacion/{codigo}/solicitud")
  @PreAuthorize("hasAuthority('DOCUMENTO_ANULAR')")
  public DocumentoFirmado solicitar(
      @PathVariable String codigo,
      @RequestBody SolicitudAnulacion solicitud,
      Authentication sesion) {
    return anulacion.solicitar(sesion.getName(), codigo, solicitud.motivo());
  }

  @PostMapping("/anulacion/{codigo}/confirmacion")
  @PreAuthorize("hasAuthority('DOCUMENTO_ANULAR')")
  public DocumentoFirmado confirmar(
      @PathVariable String codigo,
      @RequestBody ConfirmacionAnulacion solicitud,
      Authentication sesion) {
    return anulacion.confirmar(sesion.getName(), codigo, solicitud.transaccion());
  }

  @PostMapping("/anulacion/{codigo}/cancelacion")
  @PreAuthorize("hasAuthority('DOCUMENTO_ANULAR')")
  public DocumentoFirmado cancelar(@PathVariable String codigo, Authentication sesion) {
    return anulacion.cancelar(sesion.getName(), codigo);
  }
}
