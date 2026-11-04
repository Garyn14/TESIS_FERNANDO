package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;

/**
 * Preparación de la firma (HU17, RF30): cada documento pasa a Procesando firma, se genera su PDF
 * final (HU16) y se guarda en el IPFS privado, y se conservan su hash, su CID y la fecha de
 * emisión. Con los hashes, HU11 registra la firma en la blockchain con la billetera del Director.
 *
 * <p>Cada documento se prepara en sus propias transacciones: si IPFS falla con uno, ese documento
 * vuelve a Pendiente con el error en su historial, y los demás siguen.
 */
@Service
public class PreparacionDeFirma {

  /** Un lote completo cabe en una operación (HU09: hasta 300 beneficiarios). */
  static final int MAXIMO = 300;

  static final String SIN_CODIGOS = "Seleccione al menos un documento.";
  static final String DEMASIADOS =
      "Seleccione como máximo " + MAXIMO + " documentos por operación.";
  static final String NO_EXISTE = "El documento no existe.";
  static final String NO_PENDIENTE = "El documento no está pendiente.";
  static final String ORIGINAL_NO_FIRMADO =
      "El documento que reemplaza (%s) ya no está firmado. La reemisión sigue Pendiente.";
  static final String EN_PROCESO = "El documento ya está en proceso de firma.";
  static final String SIN_REVISAR = "El documento aún no fue revisado.";
  static final String LOTE_NO_EXISTE = "El lote no existe.";
  static final String SIN_BILLETERA =
      "Su cuenta no tiene billetera registrada. Pida al Administrador que la registre.";
  static final String NO_ES_FIRMANTE =
      "Su billetera no tiene el rol de firmante en el contrato. Pida al Administrador que se lo"
          + " otorgue.";
  static final String YA_REGISTRADO =
      "El código ya está registrado en la blockchain: no se registra de nuevo.";
  static final String SIN_BLOCKCHAIN =
      "No se pudo consultar la blockchain. El documento sigue Pendiente.";
  static final String FALLO_PDF = "No se pudo generar el PDF. El documento sigue Pendiente.";
  static final String FALLO_ALMACENAMIENTO =
      "No se pudo guardar el PDF. El documento volvió a Pendiente.";

  private static final Logger LOG = LoggerFactory.getLogger(PreparacionDeFirma.class);

  private final DocumentoRepository documentos;
  private final LoteRepository lotes;
  private final ContratoRegistro contrato;
  private final HistorialDocumentoRepository historial;
  private final RegistroDeDocumentos registro;
  private final GeneradorDePdf generadorDePdf;
  private final AlmacenDeArchivos almacen;
  private final TransactionTemplate transaccion;

  public PreparacionDeFirma(
      DocumentoRepository documentos,
      LoteRepository lotes,
      ContratoRegistro contrato,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      GeneradorDePdf generadorDePdf,
      AlmacenDeArchivos almacen,
      PlatformTransactionManager transacciones) {
    this.documentos = documentos;
    this.lotes = lotes;
    this.contrato = contrato;
    this.historial = historial;
    this.registro = registro;
    this.generadorDePdf = generadorDePdf;
    this.almacen = almacen;
    this.transaccion = new TransactionTemplate(transacciones);
  }

  /** Lo que la billetera registra en el contrato: código, hash del PDF y HMAC del DNI (HU11). */
  /** {@code reemplaza}: HU30, el original que la billetera anula al registrar esta reemisión. */
  public record Preparado(
      String codigo, String hash, String cid, String dniHmac, String reemplaza) {}

  public record NoPreparado(String codigo, String motivo) {}

  public record Resultado(List<Preparado> preparados, List<NoPreparado> noPreparados) {}

  private record Iniciado(Long id, String codigo, PdfFinal pdf, String dniHmac, String reemplaza) {}

  /**
   * Prepara los documentos indicados y los Pendientes de los lotes indicados (HU11: un lote se
   * selecciona entero en Por revisar).
   */
  public Resultado preparar(
      String nombreUsuario, List<String> codigos, List<String> numerosDeLote) {
    Set<String> seleccion = new LinkedHashSet<>();
    if (codigos != null) {
      codigos.stream()
          .filter(c -> c != null && !c.isBlank())
          .map(String::trim)
          .forEach(seleccion::add);
    }
    if (numerosDeLote != null) {
      transaccion.executeWithoutResult(
          estado -> {
            for (String numero : numerosDeLote) {
              Lote lote =
                  lotes
                      .findByNumero(numero == null ? "" : numero.trim())
                      .orElseThrow(
                          () ->
                              new ReglaDeNegocioException(
                                  HttpStatus.NOT_FOUND, "lotes", LOTE_NO_EXISTE));
              documentos.findByLoteIdOrderById(lote.getId()).stream()
                  .filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE)
                  .map(Documento::getCodigo)
                  .forEach(seleccion::add);
            }
          });
    }
    if (seleccion.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", SIN_CODIGOS);
    }
    if (seleccion.size() > MAXIMO) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", DEMASIADOS);
    }
    Usuario director = transaccion.execute(estado -> registro.cuenta(nombreUsuario));
    verificarFirmante(director);
    LocalDate fechaEmision = LocalDate.now(ZoneId.of("America/Lima"));
    List<Preparado> preparados = new ArrayList<>();
    List<NoPreparado> noPreparados = new ArrayList<>();
    for (String codigo : seleccion) {
      Object inicio;
      try {
        inicio = transaccion.execute(estado -> iniciar(codigo, director, fechaEmision));
      } catch (BlockchainNoDisponibleException e) {
        noPreparados.add(new NoPreparado(codigo, SIN_BLOCKCHAIN));
        continue;
      } catch (RuntimeException e) {
        // La transacción se deshizo: el documento sigue Pendiente.
        LOG.error("No se pudo generar el PDF final del documento {}", codigo, e);
        noPreparados.add(new NoPreparado(codigo, FALLO_PDF));
        continue;
      }
      if (inicio instanceof NoPreparado motivo) {
        noPreparados.add(motivo);
        continue;
      }
      Iniciado iniciado = (Iniciado) inicio;
      String cid;
      try {
        cid = almacen.guardar(codigo + ".pdf", iniciado.pdf().contenido());
      } catch (RuntimeException e) {
        LOG.error("No se pudo guardar en IPFS el PDF del documento {}", codigo, e);
        transaccion.executeWithoutResult(
            estado -> {
              documentos.devolverAPendiente(iniciado.id());
              historial.save(
                  new HistorialDocumento(
                      iniciado.id(),
                      EventoDocumento.ERROR_ALMACENAMIENTO,
                      "No se pudo guardar el PDF en el almacenamiento. Volvió a Pendiente.",
                      director.getId()));
            });
        noPreparados.add(new NoPreparado(codigo, FALLO_ALMACENAMIENTO));
        continue;
      }
      transaccion.executeWithoutResult(
          estado -> {
            documentos.guardarPdf(
                iniciado.id(), iniciado.pdf().sha256(), cid, fechaEmision, OffsetDateTime.now());
            historial.save(
                new HistorialDocumento(
                    iniciado.id(),
                    EventoDocumento.PREPARADO,
                    "Firma iniciada por " + director.getNombreCompleto(),
                    director.getId()));
          });
      LOG.info("PDF del documento {} guardado en IPFS: {}", codigo, cid);
      preparados.add(
          new Preparado(
              codigo, iniciado.pdf().sha256(), cid, iniciado.dniHmac(), iniciado.reemplaza()));
    }
    return new Resultado(preparados, noPreparados);
  }

  /**
   * Pasa el documento a Procesando firma y genera su PDF final, o devuelve el motivo por el que no
   * se puede preparar.
   */
  private Object iniciar(String codigo, Usuario director, LocalDate fechaEmision) {
    Documento documento = documentos.findByCodigo(codigo).orElse(null);
    if (documento == null) {
      return new NoPreparado(codigo, NO_EXISTE);
    }
    // HU18: un código ya registrado en el contrato no se registra de nuevo.
    if (documento.getEstado() == EstadoDocumento.PENDIENTE && contrato.estaRegistrado(codigo)) {
      LOG.error("{} está Pendiente pero ya está registrado en la blockchain", codigo);
      return new NoPreparado(codigo, YA_REGISTRADO);
    }
    // HU30: la reemisión anula al original en la misma transacción; el original debe seguir
    // Firmado. Si no, la reemisión sigue Pendiente.
    Documento original = documento.getReemplazaA();
    if (original != null
        && documento.getEstado() == EstadoDocumento.PENDIENTE
        && original.getEstado() != EstadoDocumento.FIRMADO) {
      return new NoPreparado(codigo, ORIGINAL_NO_FIRMADO.formatted(original.getCodigo()));
    }
    if (documentos.iniciarFirma(documento.getId(), OffsetDateTime.now()) == 0) {
      return new NoPreparado(codigo, motivo(documento));
    }
    // Si la generación falla, la excepción deshace también el paso a Procesando firma.
    return new Iniciado(
        documento.getId(),
        codigo,
        generadorDePdf.generar(documento, director.getNombreCompleto(), fechaEmision, false),
        documento.getDniHmac(),
        original == null ? null : original.getCodigo());
  }

  /**
   * Antes de preparar, el Director debe tener su billetera registrada con el rol de firmante en el
   * contrato (HU11): así no quedan documentos en Procesando firma que no se pueden firmar.
   */
  private void verificarFirmante(Usuario director) {
    if (director.getBilletera() == null) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, SIN_BILLETERA);
    }
    try {
      if (!contrato.esFirmante(director.getBilletera())) {
        throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_ES_FIRMANTE);
      }
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
  }

  private static String motivo(Documento documento) {
    if (documento.getEstado() == EstadoDocumento.PROCESANDO_FIRMA) {
      return EN_PROCESO;
    }
    if (documento.getEstado() != EstadoDocumento.PENDIENTE) {
      return NO_PENDIENTE;
    }
    return documento.isRevisado() ? EN_PROCESO : SIN_REVISAR;
  }
}
