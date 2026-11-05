package pe.drasatipo.plataforma.verificacion;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
