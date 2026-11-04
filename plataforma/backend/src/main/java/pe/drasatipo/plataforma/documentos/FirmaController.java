package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Firma del Director (HU11, HU17). El navegador verifica la billetera, pide la preparación (PDF en
 * IPFS y hashes), registra los hashes con la billetera y avisa la transacción para confirmarla. Si
 * la firma no se completa, pide devolver los documentos a Pendiente.
 */
@RestController
@RequestMapping("/api/firma")
@PreAuthorize("hasAuthority('DOCUMENTO_FIRMAR')")
public class FirmaController {

  private final PreparacionDeFirma preparacion;
  private final FirmaDeDocumentos firma;

  public FirmaController(PreparacionDeFirma preparacion, FirmaDeDocumentos firma) {
    this.preparacion = preparacion;
    this.firma = firma;
  }

  public record SolicitudPreparacion(List<String> codigos, List<String> lotes) {}

  public record SolicitudConfirmacion(String transaccion) {}

  public record SolicitudCancelacion(List<String> codigos, String motivo) {}

  @GetMapping("/billetera")
  public FirmaDeDocumentos.EstadoBilletera billetera(Authentication sesion) {
    return firma.billetera(sesion.getName());
  }

  @PostMapping("/preparacion")
  public PreparacionDeFirma.Resultado preparar(
      @RequestBody SolicitudPreparacion solicitud, Authentication sesion) {
    return preparacion.preparar(sesion.getName(), solicitud.codigos(), solicitud.lotes());
  }

  @PostMapping("/confirmacion")
  public FirmaDeDocumentos.Confirmacion confirmar(
      @RequestBody SolicitudConfirmacion solicitud, Authentication sesion) {
    return firma.confirmar(sesion.getName(), solicitud.transaccion());
  }

  @PostMapping("/cancelacion")
  public FirmaDeDocumentos.Cancelacion cancelar(
      @RequestBody SolicitudCancelacion solicitud, Authentication sesion) {
    return firma.cancelar(sesion.getName(), solicitud.codigos(), solicitud.motivo());
  }
}
