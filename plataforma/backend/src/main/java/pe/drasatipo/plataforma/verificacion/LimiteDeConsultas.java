package pe.drasatipo.plataforma.verificacion;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import java.time.Duration;
import java.util.Map;
import java.util.OptionalLong;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * HU20 (RNF04): limita las consultas del portal de verificación por dirección IP, para que nadie
 * pruebe códigos al azar. Un balde de Bucket4j por IP, en memoria; los que vuelven a estar llenos
 * se descartan. Con varias instancias del backend, cada una lleva su propia cuenta (DRA-44).
 */
@Component
public class LimiteDeConsultas {

  private final int porMinuto;
  private final Map<String, Bucket> baldes = new ConcurrentHashMap<>();

  public LimiteDeConsultas(
      @Value("${plataforma.verificacion.consultas-por-minuto:10}") int porMinuto) {
    this.porMinuto = porMinuto;
  }

  /**
   * Cuenta una consulta de la IP. Vacío si se puede atender; si no, los segundos que faltan para
   * poder consultar de nuevo.
   */
  public OptionalLong consumir(String ip) {
    ConsumptionProbe prueba =
        baldes.computeIfAbsent(ip, i -> nuevoBalde()).tryConsumeAndReturnRemaining(1);
    if (prueba.isConsumed()) {
      return OptionalLong.empty();
    }
    return OptionalLong.of(
        Math.max(1, Duration.ofNanos(prueba.getNanosToWaitForRefill()).toSeconds() + 1));
  }

  private Bucket nuevoBalde() {
    return Bucket.builder()
        .addLimit(
            Bandwidth.builder()
                .capacity(porMinuto)
                .refillIntervally(porMinuto, Duration.ofMinutes(1))
                .build())
        .build();
  }

  /** Descarta los baldes llenos: esas IP no consultaron en el último minuto. */
  @Scheduled(fixedDelay = 300_000)
  void descartarInactivos() {
    baldes.values().removeIf(b -> b.getAvailableTokens() >= porMinuto);
  }
}
