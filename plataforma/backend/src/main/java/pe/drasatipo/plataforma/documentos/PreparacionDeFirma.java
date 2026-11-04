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
  static final String EN_PROCESO = "El documento ya está en proceso de firma.";
  static final String SIN_REVISAR = "El documento aún no fue revisado.";
  static final String FALLO_PDF = "No se pudo generar el PDF. El documento sigue Pendiente.";
  static final String FALLO_ALMACENAMIENTO =
      "No se pudo guardar el PDF. El documento volvió a Pendiente.";

  private static final Logger LOG = LoggerFactory.getLogger(PreparacionDeFirma.class);

  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final RegistroDeDocumentos registro;
  private final GeneradorDePdf generadorDePdf;
  private final AlmacenDeArchivos almacen;
  private final TransactionTemplate transaccion;

  public PreparacionDeFirma(
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      GeneradorDePdf generadorDePdf,
      AlmacenDeArchivos almacen,
      PlatformTransactionManager transacciones) {
    this.documentos = documentos;
    this.historial = historial;
    this.registro = registro;
    this.generadorDePdf = generadorDePdf;
    this.almacen = almacen;
    this.transaccion = new TransactionTemplate(transacciones);
  }

  public record Preparado(String codigo, String hash, String cid) {}

  public record NoPreparado(String codigo, String motivo) {}

  public record Resultado(List<Preparado> preparados, List<NoPreparado> noPreparados) {}

  private record Iniciado(Long id, String codigo, PdfFinal pdf) {}

  public Resultado preparar(String nombreUsuario, List<String> codigos) {
    Set<String> seleccion = new LinkedHashSet<>();
    if (codigos != null) {
      codigos.stream()
          .filter(c -> c != null && !c.isBlank())
          .map(String::trim)
          .forEach(seleccion::add);
    }
    if (seleccion.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", SIN_CODIGOS);
    }
    if (seleccion.size() > MAXIMO) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", DEMASIADOS);
    }
    Usuario director = transaccion.execute(estado -> registro.cuenta(nombreUsuario));
    LocalDate fechaEmision = LocalDate.now(ZoneId.of("America/Lima"));
    List<Preparado> preparados = new ArrayList<>();
    List<NoPreparado> noPreparados = new ArrayList<>();
    for (String codigo : seleccion) {
      Object inicio;
      try {
        inicio = transaccion.execute(estado -> iniciar(codigo, director, fechaEmision));
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
      preparados.add(new Preparado(codigo, iniciado.pdf().sha256(), cid));
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
    if (documentos.iniciarFirma(documento.getId()) == 0) {
      return new NoPreparado(codigo, motivo(documento));
    }
    // Si la generación falla, la excepción deshace también el paso a Procesando firma.
    return new Iniciado(
        documento.getId(),
        codigo,
        generadorDePdf.generar(documento, director.getNombreCompleto(), fechaEmision, false));
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
