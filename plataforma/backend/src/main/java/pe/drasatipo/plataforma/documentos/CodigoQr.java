package pe.drasatipo.plataforma.documentos;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.awt.image.BufferedImage;
import java.util.Map;

/** Código QR de la dirección de verificación de un documento (HU16, RF36). */
final class CodigoQr {

  private CodigoQr() {}

  /** Imagen en blanco y negro, con corrección de errores media para que resista la impresión. */
  static BufferedImage imagen(String contenido, int lado) {
    try {
      return MatrixToImageWriter.toBufferedImage(
          new QRCodeWriter()
              .encode(
                  contenido,
                  BarcodeFormat.QR_CODE,
                  lado,
                  lado,
                  Map.of(
                      EncodeHintType.ERROR_CORRECTION,
                      ErrorCorrectionLevel.M,
                      EncodeHintType.MARGIN,
                      1,
                      EncodeHintType.CHARACTER_SET,
                      "UTF-8")));
    } catch (WriterException e) {
      throw new IllegalStateException("No se pudo generar el código QR", e);
    }
  }
}
