package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pe.drasatipo.plataforma.areas.TipoDocumento;

/** HU16 (DRA-24): PDF final con fecha de emisión, QR, código y leyenda, y su SHA-256. */
class GeneradorDePdfTest {

  private static final String TOKEN = "Zk3pQ9vR2mT8xL5nB7cW1yH4jD6fG0sA_e-uIoPqRsT";

  private final GeneradorDePdf generador = new GeneradorDePdf("https://verifica.ejemplo.pe/");

  /** Un Certificado de Trabajo pendiente, como lo deja HU08. */
  private static Documento trabajo() {
    TipoDocumento tipo = instancia(TipoDocumento.class);
    ReflectionTestUtils.setField(tipo, "codigo", "CERTIFICADO_TRABAJO");
    ReflectionTestUtils.setField(tipo, "nombre", "Certificado de Trabajo");
    ReflectionTestUtils.setField(tipo, "titulo", "CERTIFICADO");
    ReflectionTestUtils.setField(tipo, "origen", "SOLICITUD_PARTE");
    Documento documento = instancia(Documento.class);
    ReflectionTestUtils.setField(documento, "codigo", "DRA-2026-F8R2MA");
    ReflectionTestUtils.setField(documento, "tokenQr", TOKEN);
    ReflectionTestUtils.setField(documento, "tipo", tipo);
    ReflectionTestUtils.setField(documento, "nombres", "Lucía");
    ReflectionTestUtils.setField(documento, "apellidos", "Paredes Quinto");
    ReflectionTestUtils.setField(documento, "dni", "45829364");
    ReflectionTestUtils.setField(documento, "datos", Map.of());
    ReflectionTestUtils.setField(
        documento,
        "texto",
        "Por haber laborado en la Agencia Agraria Satipo como asistente administrativa, del"
            + " 02/01/2025 al 30/09/2026, demostrando responsabilidad y buen desempeño.");
    return documento;
  }

  private static <T> T instancia(Class<T> clase) {
    try {
      var constructor = clase.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String texto(byte[] pdf) throws Exception {
    PdfReader lector = new PdfReader(pdf);
    try {
      return new PdfTextExtractor(lector).getTextFromPage(1).replaceAll("\\s+", " ");
    } finally {
      lector.close();
    }
  }

  @Test
  void incluyeLaFechaDeEmisionElCodigoLaLeyendaYLosDatosRevisados() throws Exception {
    PdfFinal pdf =
        generador.generar(
            trabajo(), "Ing. Carlos Mendoza Rivera", LocalDate.of(2026, 11, 4), false);
    assertThat(new String(pdf.contenido(), 0, 5)).isEqualTo("%PDF-");
    String texto = texto(pdf.contenido());
    assertThat(texto)
        .contains("AGENCIA AGRARIA SATIPO – DRA JUNÍN")
        .contains("CERTIFICADO")
        .contains("Otorgado a")
        .contains("LUCÍA PAREDES QUINTO")
        .contains("como asistente administrativa")
        .contains("Fecha de emisión: 4 de noviembre de 2026")
        .contains("DRA-2026-F8R2MA")
        .contains("Ing. Carlos Mendoza Rivera")
        .contains("Director de la Agencia Agraria Satipo")
        .contains("Firmado digitalmente mediante blockchain")
        .contains(
            "Verifique la autenticidad de este documento en verifica.ejemplo.pe con el código"
                + " DRA-2026-F8R2MA")
        .doesNotContain("VISTA PREVIA")
        .doesNotContain("MUESTRA")
        // El DNI no se imprime en el certificado del prototipo.
        .doesNotContain("45829364");
  }

  @Test
  void elHashEsElSha256DeLosBytesExactosDelArchivo() throws Exception {
    PdfFinal pdf = generador.generar(trabajo(), null, LocalDate.of(2026, 11, 4), false);
    assertThat(pdf.sha256())
        .matches("[0-9a-f]{64}")
        .isEqualTo(
            HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(pdf.contenido())));
  }

  @Test
  void elQrLlevaLaDireccionDeVerificacionConElTokenYNuncaElDni() throws Exception {
    String direccion = generador.direccionDeVerificacion(TOKEN);
    assertThat(direccion).isEqualTo("https://verifica.ejemplo.pe/verificar/" + TOKEN);
    var leido =
        new MultiFormatReader()
            .decode(
                new BinaryBitmap(
                    new HybridBinarizer(
                        new BufferedImageLuminanceSource(CodigoQr.imagen(direccion, 300)))));
    assertThat(leido.getText()).isEqualTo(direccion).doesNotContain("45829364");
  }

  @Test
  void laMuestraLlevaSuMarcaYNoEsElMismoArchivo() throws Exception {
    Documento documento = trabajo();
    PdfFinal muestra = generador.generar(documento, null, LocalDate.of(2026, 11, 4), true);
    PdfFinal definitivo = generador.generar(documento, null, LocalDate.of(2026, 11, 4), false);
    assertThat(texto(muestra.contenido())).contains("MUESTRA – SIN VALOR");
    assertThat(muestra.sha256()).isNotEqualTo(definitivo.sha256());
  }

  @Test
  void unaConstanciaLlevaSuTitulo() throws Exception {
    Documento documento = trabajo();
    TipoDocumento tipo = documento.getTipo();
    ReflectionTestUtils.setField(tipo, "titulo", "CONSTANCIA");
    assertThat(
            texto(generador.generar(documento, null, LocalDate.of(2026, 1, 2), false).contenido()))
        .contains("CONSTANCIA")
        .contains("Fecha de emisión: 2 de enero de 2026");
  }
}
