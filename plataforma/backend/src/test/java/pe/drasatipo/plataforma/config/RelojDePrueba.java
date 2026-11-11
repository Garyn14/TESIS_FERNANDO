package pe.drasatipo.plataforma.config;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** DRA-62: un reloj en hora de Lima que las pruebas adelantan para que un documento venza. */
public class RelojDePrueba extends Clock {

  private Duration adelanto = Duration.ZERO;

  public void adelantar(Duration cuanto) {
    adelanto = cuanto;
  }

  public void volverAHoy() {
    adelanto = Duration.ZERO;
  }

  @Override
  public ZoneId getZone() {
    return RelojConfig.LIMA;
  }

  @Override
  public Clock withZone(ZoneId zona) {
    return Clock.offset(Clock.system(zona), adelanto);
  }

  @Override
  public Instant instant() {
    return Instant.now().plus(adelanto);
  }

  @TestConfiguration
  public static class Configuracion {
    @Bean
    @Primary
    public RelojDePrueba relojDePrueba() {
      return new RelojDePrueba();
    }
  }
}
