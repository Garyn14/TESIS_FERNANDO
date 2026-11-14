package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import pe.drasatipo.plataforma.verificacion.ResultadoVerificacion;
import pe.drasatipo.plataforma.verificacion.VerificacionDeAutenticidad.Comprobacion;

/**
 * DRA-81: los records con un PDF se comparan por su contenido, no por la referencia del arreglo.
 */
class PdfFinalTest {

  @Test
  void dosPdfConLosMismosBytesSonIguales() {
    PdfFinal a = new PdfFinal(new byte[] {1, 2, 3}, "abc");
    PdfFinal b = new PdfFinal(new byte[] {1, 2, 3}, "abc");

    assertThat(a).isEqualTo(b).hasSameHashCodeAs(b);
    assertThat(a).isNotEqualTo(new PdfFinal(new byte[] {1, 2, 4}, "abc"));
    assertThat(a).isNotEqualTo(new PdfFinal(new byte[] {1, 2, 3}, "otro"));
    assertThat(a).hasToString("PdfFinal[3 bytes, sha256=abc]");
  }

  @Test
  void dosComprobacionesConElMismoPdfSonIguales() {
    ResultadoVerificacion valido =
        new ResultadoVerificacion(
            ResultadoVerificacion.Resultado.VALIDO, "ok", null, null, null, null, false, null);
    Comprobacion a = new Comprobacion(valido, new byte[] {7, 8});
    Comprobacion b = new Comprobacion(valido, new byte[] {7, 8});

    assertThat(a).isEqualTo(b).hasSameHashCodeAs(b);
    assertThat(a).isNotEqualTo(new Comprobacion(valido, new byte[] {9}));
    assertThat(a.toString()).endsWith(", 2 bytes]");
    assertThat(new Comprobacion(valido, null)).isEqualTo(new Comprobacion(valido, null));
  }
}
