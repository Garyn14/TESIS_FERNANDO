package pe.drasatipo.plataforma.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * DRA-62: el reloj con que se decide si un documento venció, en hora de Lima. Las pruebas lo
 * reemplazan para adelantar el tiempo.
 */
@Configuration
public class RelojConfig {

  public static final ZoneId LIMA = ZoneId.of("America/Lima");

  @Bean
  @ConditionalOnMissingBean
  public Clock reloj() {
    return Clock.system(LIMA);
  }
}
