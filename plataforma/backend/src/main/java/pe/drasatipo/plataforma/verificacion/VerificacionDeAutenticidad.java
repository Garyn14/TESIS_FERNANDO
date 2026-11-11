package pe.drasatipo.plataforma.verificacion;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.almacenamiento.AlmacenamientoNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.blockchain.RegistroEnContrato;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.documentos.Documento;
import pe.drasatipo.plataforma.documentos.DocumentoRepository;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;
import pe.drasatipo.plataforma.documentos.GeneradorDePdf;
import pe.drasatipo.plataforma.verificacion.ResultadoVerificacion.Resultado;

/**
 * HU21 (RF38, RF41): comprueba la autenticidad de un documento comparando el PDF guardado en IPFS
 * con su registro en el contrato. Solo lee la blockchain: nunca envía transacciones. La blockchain
 * es la fuente de verdad (RNF10): si el contrato y la base no coinciden, manda el contrato.
 */
@Service
public class VerificacionDeAutenticidad {

  static final String NO_DISPONIBLE =
      "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.";

  /** El token del QR: 256 bits en Base64 URL sin relleno (RF16, RNF04). */
  private static final Pattern TOKEN = Pattern.compile("^[A-Za-z0-9_-]{43}$");

  private static final Logger LOG = LoggerFactory.getLogger(VerificacionDeAutenticidad.class);

  private final DocumentoRepository documentos;
  private final ContratoRegistro contrato;
  private final AlmacenDeArchivos almacen;
  private final Clock reloj;

  public VerificacionDeAutenticidad(
      DocumentoRepository documentos,
      ContratoRegistro contrato,
      AlmacenDeArchivos almacen,
      Clock reloj) {
    this.documentos = documentos;
    this.contrato = contrato;
    this.almacen = almacen;
    this.reloj = reloj;
  }

  /**
   * El resultado de la comprobación y, si es Válido o Anulado, el PDF comprobado (lo muestra el
   * portal con el QR, HU19).
   */
  public record Comprobacion(ResultadoVerificacion resultado, byte[] pdf) {}

  /** El código impreso: DRA-AAAA-XXXXXX, sin caracteres que se confunden (RF16, RNF04). */
  private static final Pattern CODIGO =
      Pattern.compile("^DRA(\\d{4})([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})$");

  /**
   * HU20: el código escrito tal como aparece en el documento; acepta minúsculas, espacios y guiones
   * opcionales. Vacío si no tiene el formato.
   */
  static Optional<String> normalizarCodigo(String escrito) {
    if (escrito == null) {
      return Optional.empty();
    }
    var encontrado =
        CODIGO.matcher(escrito.strip().toUpperCase(java.util.Locale.ROOT).replaceAll("[\\s-]", ""));
    return encontrado.matches()
        ? Optional.of("DRA-" + encontrado.group(1) + "-" + encontrado.group(2))
        : Optional.empty();
  }

  /** HU20 (RF40): verifica el documento del código de verificación. */
  @Transactional(readOnly = true)
  public Comprobacion porCodigo(String codigo) {
    return normalizarCodigo(codigo)
        .map(c -> comprobar(documentos.findByCodigo(c), "código"))
        .orElseGet(() -> new Comprobacion(ResultadoVerificacion.noValido(), null));
  }

  /** Verifica el documento del token del QR (HU19). */
  @Transactional(readOnly = true)
  public Comprobacion porToken(String token) {
    if (token == null || !TOKEN.matcher(token).matches()) {
      return new Comprobacion(ResultadoVerificacion.noValido(), null);
    }
    return comprobar(documentos.findByTokenQr(token), "token");
  }

  /**
   * Comprueba un documento de la plataforma. Un error de la blockchain o de IPFS no es un resultado
   * No válido: se informa que no se pudo verificar (503).
   */
  Comprobacion comprobar(Optional<Documento> encontrado, String como) {
    long inicio = System.nanoTime();
    try {
      Comprobacion comprobacion = decidir(encontrado);
      LOG.info(
          "Verificación por {} de {}: {} en {} ms",
          como,
          encontrado.map(Documento::getCodigo).orElse("(inexistente)"),
          comprobacion.resultado().resultado(),
          (System.nanoTime() - inicio) / 1_000_000);
      return comprobacion;
    } catch (BlockchainNoDisponibleException | AlmacenamientoNoDisponibleException e) {
      LOG.warn("Verificación no disponible: {}", e.getMessage());
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, NO_DISPONIBLE);
    }
  }

  private Comprobacion decidir(Optional<Documento> encontrado) {
    if (encontrado.isEmpty()) {
      return new Comprobacion(ResultadoVerificacion.noValido(), null);
    }
    Documento documento = encontrado.get();
    String codigo = documento.getCodigo();
    // Solo un documento emitido (firmado, y quizá anulado después) tiene PDF final y registro.
    if ((documento.getEstado() != EstadoDocumento.FIRMADO
            && documento.getEstado() != EstadoDocumento.ANULADO)
        || documento.getCid() == null) {
      return noValido(codigo, "no está emitido (" + documento.getEstado() + ")");
    }
    Optional<RegistroEnContrato> registro = contrato.registroDe(codigo);
    if (registro.isEmpty()) {
      return noValido(codigo, "no está registrado en el contrato");
    }
    byte[] pdf = almacen.recuperar(documento.getCid());
    String hash = sha256(pdf);
    if (!hash.equalsIgnoreCase(registro.get().hashPdf())) {
      return noValido(
          codigo,
          "el SHA-256 del PDF en IPFS (%s) no es el registrado (%s)"
              .formatted(hash, registro.get().hashPdf()));
    }
    if (!documento.getDniHmac().equalsIgnoreCase(registro.get().dniHmac())) {
      return noValido(codigo, "el HMAC del DNI de la plataforma no es el registrado");
    }
    // DRA-62: la fecha de vencimiento guardada debe ser la impresa en el PDF, cuya huella se acaba
    // de comprobar con la blockchain. Si alguien la cambia en la base, se nota.
    if (!vigenciaCoincide(pdf, documento.getVenceEn())) {
      LOG.error(
          "Inconsistencia: la fecha de vencimiento de {} en la base ({}) no es la impresa en su PDF",
          codigo,
          documento.getVenceEn());
      return noValido(codigo, "la fecha de vencimiento no coincide con la del PDF");
    }
    Optional<Instant> anulado = contrato.anuladoEn(codigo);
    if (anulado.isEmpty() && documento.getEstado() == EstadoDocumento.ANULADO) {
      LOG.error(
          "Inconsistencia: {} está Anulado en la plataforma pero no en el contrato; manda el"
              + " contrato",
          codigo);
    }
    var emitido = registro.get().registradoEn().atOffset(ZoneOffset.UTC);
    ResultadoVerificacion resultado =
        anulado.isPresent()
            ? new ResultadoVerificacion(
                Resultado.ANULADO,
                ResultadoVerificacion.MENSAJE_ANULADO,
                documento.getTipo().getNombre(),
                documento.getBeneficiario(),
                emitido,
                anulado.get().atOffset(ZoneOffset.UTC),
                contrato.reemplazadoPor(codigo).isPresent(),
                documento.getVenceEn())
            : documento.estaVencido(LocalDate.now(reloj))
                ? new ResultadoVerificacion(
                    Resultado.VENCIDO,
                    ResultadoVerificacion.MENSAJE_VENCIDO.formatted(
                        GeneradorDePdf.enLetras(documento.getVenceEn())),
                    documento.getTipo().getNombre(),
                    documento.getBeneficiario(),
                    emitido,
                    null,
                    false,
                    documento.getVenceEn())
                : new ResultadoVerificacion(
                    Resultado.VALIDO,
                    ResultadoVerificacion.MENSAJE_VALIDO,
                    documento.getTipo().getNombre(),
                    documento.getBeneficiario(),
                    emitido,
                    null,
                    false,
                    documento.getVenceEn());
    return new Comprobacion(resultado, pdf);
  }

  /**
   * DRA-62: el PDF imprime "Válido hasta …" solo si el documento vence, y con la misma fecha que la
   * base. Se compara el texto del PDF sin saltos de línea ni espacios repetidos.
   */
  static boolean vigenciaCoincide(byte[] pdf, LocalDate venceEn) {
    String texto;
    try {
      texto =
          new com.lowagie.text.pdf.parser.PdfTextExtractor(new com.lowagie.text.pdf.PdfReader(pdf))
              .getTextFromPage(1)
              .replaceAll("\\s+", " ");
    } catch (java.io.IOException e) {
      LOG.error("No se pudo leer el texto del PDF", e);
      return false;
    }
    return venceEn == null
        ? !texto.contains("Válido hasta")
        : texto.contains(GeneradorDePdf.validoHasta(venceEn));
  }

  private static Comprobacion noValido(String codigo, String motivo) {
    LOG.warn("Verificación de {}: No válido porque {}", codigo, motivo);
    return new Comprobacion(ResultadoVerificacion.noValido(), null);
  }

  static String sha256(byte[] contenido) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
