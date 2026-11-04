package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Firma del Director (HU11, HU17). La preparación genera el PDF final de cada documento, lo guarda
 * en IPFS y devuelve los hashes que la billetera registra en la blockchain.
 */
@RestController
@RequestMapping("/api/firma")
@PreAuthorize("hasAuthority('DOCUMENTO_FIRMAR')")
public class FirmaController {

  private final PreparacionDeFirma preparacion;

  public FirmaController(PreparacionDeFirma preparacion) {
    this.preparacion = preparacion;
  }

  public record SolicitudPreparacion(List<String> codigos) {}

  @PostMapping("/preparacion")
  public PreparacionDeFirma.Resultado preparar(
      @RequestBody SolicitudPreparacion solicitud, Authentication sesion) {
    return preparacion.preparar(sesion.getName(), solicitud.codigos());
  }
}
