package pe.drasatipo.plataforma.verificacion;

import jakarta.servlet.http.HttpServletRequest;
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

  static final String DEMASIADAS =
      "Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.";

  private final VerificacionDeAutenticidad verificacion;
  private final LimiteDeConsultas limite;

  public VerificacionController(VerificacionDeAutenticidad verificacion, LimiteDeConsultas limite) {
    this.verificacion = verificacion;
    this.limite = limite;
  }

  /** HU21, HU19: resultado de la verificación del documento del token del QR. */
  @GetMapping("/{token}")
  public ResponseEntity<?> porToken(@PathVariable String token, HttpServletRequest pedido) {
    return limitado(pedido, () -> verificacion.porToken(token).resultado());
  }

  /** HU20 (RF40): resultado con el código de verificación; nunca entrega el documento. */
  @GetMapping("/codigo/{codigo}")
  public ResponseEntity<?> porCodigo(@PathVariable String codigo, HttpServletRequest pedido) {
    return limitado(pedido, () -> verificacion.porCodigo(codigo).resultado());
  }

  /** RNF04: hasta N consultas por minuto por IP; la siguiente responde 429 con Retry-After. */
  private ResponseEntity<?> limitado(
      HttpServletRequest pedido, java.util.function.Supplier<ResultadoVerificacion> consulta) {
    var espera = limite.consumir(pedido.getRemoteAddr());
    if (espera.isPresent()) {
      return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
          .header(HttpHeaders.RETRY_AFTER, String.valueOf(espera.getAsLong()))
          .body(java.util.Map.of("mensaje", DEMASIADAS, "campos", java.util.Map.of()));
    }
    return ResponseEntity.ok(consulta.get());
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
