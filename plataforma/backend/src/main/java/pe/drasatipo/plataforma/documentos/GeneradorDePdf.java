package pe.drasatipo.plataforma.documentos;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * PDF final de un documento (HU16, RF30, RF36): la plantilla de la vista previa, sin la marca de
 * agua, con la fecha de emisión, el código QR, el código de verificación y la leyenda del portal.
 * Calcula también el SHA-256 de los bytes del archivo.
 */
@Component
public class GeneradorDePdf {

  private static final Color INSTITUCIONAL = new Color(0x1b, 0x5e, 0x20);
  private static final Color DORADO = new Color(0xe8, 0xb5, 0x00);
  private static final Color TINTA = new Color(0x1f, 0x2a, 0x22);
  private static final Color TENUE = new Color(0x68, 0x73, 0x6a);

  private final String portal;
  private final byte[] logo;
  private final BaseFont normal;
  private final BaseFont negrita;

  public GeneradorDePdf(@Value("${plataforma.portal.url}") String portal) {
    this.portal = portal.replaceAll("/+$", "");
    try (InputStream entrada = getClass().getResourceAsStream("/documentos/logo-dra.png")) {
      this.logo = entrada.readAllBytes();
      // Cp1252 cubre las tildes y la ñ del castellano con las fuentes estándar del PDF.
      this.normal = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
      this.negrita =
          BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
    } catch (IOException | DocumentException e) {
      throw new IllegalStateException("No se pudieron cargar el logo o las fuentes del PDF", e);
    }
  }

  /**
   * Dirección que lleva el QR: la del portal con el token aleatorio del documento, nunca el DNI.
   */
  public String direccionDeVerificacion(String tokenQr) {
    return portal + "/verificar/" + tokenQr;
  }

  /** Dirección del portal como se imprime en la leyenda, sin "https://". */
  String portalImpreso() {
    return portal.replaceFirst("^https?://", "");
  }

  /**
   * Genera el PDF de un documento. Con {@code muestra} lleva la marca "MUESTRA – SIN VALOR": es la
   * muestra que ve el Director al revisar, que no se guarda ni se registra.
   */
  public PdfFinal generar(
      Documento documento, String firmante, LocalDate fechaEmision, boolean muestra) {
    ByteArrayOutputStream salida = new ByteArrayOutputStream();
    Document pdf = new Document(PageSize.A4.rotate(), 64, 64, 54, 40);
    try {
      PdfWriter escritor = PdfWriter.getInstance(pdf, salida);
      pdf.addTitle(documento.getTipo().getNombre() + " " + documento.getCodigo());
      pdf.addAuthor("Agencia Agraria Satipo – DRA Junín");
      pdf.open();
      marco(escritor.getDirectContentUnder(), pdf.getPageSize());

      pdf.add(encabezado());
      pdf.add(centrado(documento.getTipo().getTitulo(), fuente(normal, 34, INSTITUCIONAL), 18, 4));
      pdf.add(centrado("Otorgado a", fuente(normal, 13, TINTA), 6, 2));
      pdf.add(
          centrado(
              documento.getBeneficiario().toUpperCase(),
              fuente(negrita, 24, INSTITUCIONAL),
              2,
              10));
      Paragraph texto = centrado(documento.getTexto(), fuente(normal, 13, TINTA), 4, 0);
      texto.setIndentationLeft(60);
      texto.setIndentationRight(60);
      texto.setLeading(19);
      pdf.add(texto);
      pdf.add(pie(documento, firmante, fechaEmision));
      pdf.add(
          centrado(
              "Verifique la autenticidad de este documento en %s con el código %s"
                  .formatted(portalImpreso(), documento.getCodigo()),
              fuente(normal, 9, TENUE),
              10,
              0));

      if (muestra) {
        marcaDeMuestra(escritor.getDirectContent(), pdf.getPageSize());
      }
      pdf.close();
    } catch (DocumentException | IOException e) {
      throw new IllegalStateException("No se pudo generar el PDF de " + documento.getCodigo(), e);
    }
    byte[] contenido = salida.toByteArray();
    return new PdfFinal(contenido, sha256(contenido));
  }

  static String sha256(byte[] contenido) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 no está disponible", e);
    }
  }

  private PdfPTable encabezado() throws IOException, DocumentException {
    PdfPTable tabla = new PdfPTable(new float[] {1, 9});
    tabla.setTotalWidth(330);
    tabla.setLockedWidth(true);
    tabla.setHorizontalAlignment(Element.ALIGN_CENTER);
    Image imagen = Image.getInstance(logo);
    imagen.scaleToFit(36, 36);
    PdfPCell conLogo = new PdfPCell(imagen, false);
    conLogo.setBorder(Rectangle.NO_BORDER);
    conLogo.setVerticalAlignment(Element.ALIGN_MIDDLE);
    tabla.addCell(conLogo);
    PdfPCell nombre =
        new PdfPCell(
            new Phrase("AGENCIA AGRARIA SATIPO – DRA JUNÍN", fuente(negrita, 13, INSTITUCIONAL)));
    nombre.setBorder(Rectangle.NO_BORDER);
    nombre.setVerticalAlignment(Element.ALIGN_MIDDLE);
    tabla.addCell(nombre);
    return tabla;
  }

  /** Fecha de emisión, código QR con el código de verificación y firma del Director. */
  private PdfPTable pie(Documento documento, String firmante, LocalDate fechaEmision)
      throws IOException, DocumentException {
    PdfPTable tabla = new PdfPTable(new float[] {1, 1, 1});
    tabla.setWidthPercentage(100);
    tabla.setSpacingBefore(26);

    PdfPCell fecha =
        celda(
            new Paragraph(
                "Fecha de emisión: " + PlantillasDeDocumento.enLetras(fechaEmision),
                fuente(normal, 11, TINTA)));
    tabla.addCell(fecha);

    Image qr =
        Image.getInstance(
            CodigoQr.imagen(direccionDeVerificacion(documento.getTokenQr()), 300), null);
    qr.scaleToFit(92, 92);
    PdfPCell conQr = celda(null);
    qr.setAlignment(Element.ALIGN_CENTER);
    conQr.addElement(qr);
    Paragraph codigo = new Paragraph(documento.getCodigo(), fuente(negrita, 10, TINTA));
    codigo.setAlignment(Element.ALIGN_CENTER);
    conQr.addElement(codigo);
    tabla.addCell(conQr);

    Paragraph firma = new Paragraph();
    firma.setAlignment(Element.ALIGN_CENTER);
    firma.add(new Chunk("______________________________\n", fuente(normal, 11, TINTA)));
    if (firmante != null) {
      firma.add(new Chunk(firmante + "\n", fuente(negrita, 11, INSTITUCIONAL)));
    }
    firma.add(new Chunk("Director de la Agencia Agraria Satipo\n", fuente(normal, 11, TINTA)));
    firma.add(new Chunk("Firmado digitalmente mediante blockchain", fuente(normal, 8, TENUE)));
    tabla.addCell(celda(firma));
    return tabla;
  }

  private static PdfPCell celda(Paragraph contenido) {
    PdfPCell celda = new PdfPCell();
    celda.setBorder(Rectangle.NO_BORDER);
    celda.setHorizontalAlignment(Element.ALIGN_CENTER);
    celda.setVerticalAlignment(Element.ALIGN_BOTTOM);
    if (contenido != null) {
      contenido.setAlignment(Element.ALIGN_CENTER);
      celda.addElement(contenido);
    }
    return celda;
  }

  /** Borde verde y doble filete dorado, como el certificado del prototipo. */
  private static void marco(PdfContentByte lienzo, Rectangle pagina) {
    lienzo.setColorStroke(INSTITUCIONAL);
    lienzo.setLineWidth(1.5f);
    lienzo.rectangle(18, 18, pagina.getWidth() - 36, pagina.getHeight() - 36);
    lienzo.stroke();
    lienzo.setColorStroke(DORADO);
    lienzo.setLineWidth(1.2f);
    lienzo.rectangle(26, 26, pagina.getWidth() - 52, pagina.getHeight() - 52);
    lienzo.stroke();
    lienzo.rectangle(30, 30, pagina.getWidth() - 60, pagina.getHeight() - 60);
    lienzo.stroke();
  }

  private void marcaDeMuestra(PdfContentByte lienzo, Rectangle pagina) {
    lienzo.saveState();
    PdfGState transparente = new PdfGState();
    transparente.setFillOpacity(0.15f);
    lienzo.setGState(transparente);
    lienzo.beginText();
    lienzo.setFontAndSize(negrita, 64);
    lienzo.setColorFill(INSTITUCIONAL);
    lienzo.showTextAligned(
        Element.ALIGN_CENTER,
        "MUESTRA – SIN VALOR",
        pagina.getWidth() / 2,
        pagina.getHeight() / 2,
        20);
    lienzo.endText();
    lienzo.restoreState();
  }

  private static Paragraph centrado(String texto, Font fuente, float antes, float despues) {
    Paragraph parrafo = new Paragraph(texto, fuente);
    parrafo.setAlignment(Element.ALIGN_CENTER);
    parrafo.setSpacingBefore(antes);
    parrafo.setSpacingAfter(despues);
    return parrafo;
  }

  private static Font fuente(BaseFont base, float tamano, Color color) {
    return new Font(base, tamano, Font.NORMAL, color);
  }
}
