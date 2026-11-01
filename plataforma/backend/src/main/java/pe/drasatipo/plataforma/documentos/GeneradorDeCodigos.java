package pe.drasatipo.plataforma.documentos;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

/** Código de verificación y token del QR de cada documento (RF16, RNF04). */
@Component
public class GeneradorDeCodigos {

  /** Mayúsculas y dígitos sin 0, O, 1, I ni L, que se confunden al leerlos. */
  static final String ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  private final SecureRandom azar = new SecureRandom();

  /** DRA-AAAA-XXXXXX, con el año de envío. */
  public String codigo(int anio) {
    StringBuilder codigo = new StringBuilder("DRA-").append(anio).append('-');
    for (int i = 0; i < 6; i++) {
      codigo.append(ALFABETO.charAt(azar.nextInt(ALFABETO.length())));
    }
    return codigo.toString();
  }

  /** 256 bits aleatorios en Base64 URL sin relleno (43 caracteres). */
  public String tokenQr() {
    byte[] bytes = new byte[32];
    azar.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
