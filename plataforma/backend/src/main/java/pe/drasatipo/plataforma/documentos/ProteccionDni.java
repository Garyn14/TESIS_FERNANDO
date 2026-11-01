package pe.drasatipo.plataforma.documentos;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * HMAC-SHA256 del DNI del beneficiario (RF17). La clave secreta se configura fuera del código
 * (PLATAFORMA_CLAVE_HMAC_DNI); en AWS se guarda en el gestor de secretos (RNF03).
 */
@Component
public class ProteccionDni {

  static final int LONGITUD_MINIMA = 32;

  private final byte[] clave;

  public ProteccionDni(@Value("${plataforma.dni.clave-hmac:}") String clave) {
    this.clave = clave.getBytes(StandardCharsets.UTF_8);
  }

  /** False si la clave falta o es demasiado corta: no se registra ningún documento. */
  public boolean configurada() {
    return clave.length >= LONGITUD_MINIMA;
  }

  /** HMAC en hexadecimal, 64 caracteres. */
  public String hmac(String dni) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(clave, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(dni.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("No se pudo calcular el HMAC del DNI", e);
    }
  }
}
