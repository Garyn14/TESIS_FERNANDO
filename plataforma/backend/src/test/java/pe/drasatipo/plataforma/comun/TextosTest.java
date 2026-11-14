package pe.drasatipo.plataforma.comun;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextosTest {

  @Test
  void sinFinalQuitaSoloLasRepeticionesDelFinal() {
    assertThat(Textos.sinFinal("http://localhost:5174//", '/')).isEqualTo("http://localhost:5174");
    assertThat(Textos.sinFinal("http://localhost:5174", '/')).isEqualTo("http://localhost:5174");
    assertThat(Textos.sinFinal("///", '/')).isEmpty();
    assertThat(Textos.sinFinal("", '/')).isEmpty();
  }

  @Test
  void sinExtremosQuitaLasRepeticionesDeAmbosLados() {
    assertThat(Textos.sinExtremos("__AREA_DE_PRUEBA__", '_')).isEqualTo("AREA_DE_PRUEBA");
    assertThat(Textos.sinExtremos("AREA", '_')).isEqualTo("AREA");
    assertThat(Textos.sinExtremos("____", '_')).isEmpty();
  }

  @Test
  void unTextoLargoSinElCaracterNoTarda() {
    String largo = "a".repeat(200_000) + "b";
    assertThat(Textos.sinFinal(largo, '/')).isEqualTo(largo);
  }
}
