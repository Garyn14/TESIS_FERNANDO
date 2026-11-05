package pe.drasatipo.plataforma.verificacion;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.verificacion.ResultadoVerificacion.Resultado;

/** API pública del portal de verificación (HU19–HU21, RF37): no requiere sesión. */
@RestController
@RequestMapping("/api/verificacion")
public class VerificacionController {

  private final VerificacionDeAutenticidad verificacion;

  public VerificacionController(VerificacionDeAutenticidad verificacion) {
    this.verificacion = verificacion;
  }

  /** HU21: resultado de la verificación del documento del token del QR. */
  @GetMapping("/{token}")
  public ResultadoVerificacion porToken(@PathVariable String token) {
    return verificacion.porToken(token).resultado();
  }

  static final String SIN_DOCUMENTO = "El documento no está disponible.";

  /**
   * HU19 (RF39): el documento completo, solo si la verificación es Válida. Es el PDF recuperado de
   * IPFS cuyo hash se acaba de comprobar en la blockchain. No se guarda en caché.
   */
  @GetMapping("/{token}/documento")
  public ResponseEntity<byte[]> documento(@PathVariable String token) {
    var comprobacion = verificacion.porToken(token);
    if (comprobacion.resultado().resultado() != Resultado.VALIDO) {
      throw new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, SIN_DOCUMENTO);
    }
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .cacheControl(CacheControl.noStore())
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename("documento-verificado.pdf").build().toString())
        .body(comprobacion.pdf());
  }
}
