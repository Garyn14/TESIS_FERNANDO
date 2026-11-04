package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;

/**
 * Bandeja del Director (HU10, RF21, RF22): los documentos pendientes de todas las áreas, del más
 * antiguo al más reciente, con los lotes como un solo elemento. Abrir un documento o un lote para
 * revisarlo queda registrado; en un lote, cuenta para todos sus documentos.
 */
@Service
public class RevisionDelDirector {

  static final String NO_PENDIENTE = "Este documento no está pendiente de revisión.";
  static final String LOTE_NO_PENDIENTE = "Este lote no está pendiente de revisión.";

  private final DocumentoRepository documentos;
  private final LoteRepository lotes;
  private final HistorialDocumentoRepository historial;
  private final RegistroDeDocumentos registro;
  private final RegistroDeLotes registroDeLotes;
  private final GeneradorDePdf generadorDePdf;

  public RevisionDelDirector(
      DocumentoRepository documentos,
      LoteRepository lotes,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      RegistroDeLotes registroDeLotes,
      GeneradorDePdf generadorDePdf) {
    this.documentos = documentos;
    this.lotes = lotes;
    this.historial = historial;
    this.registro = registro;
    this.registroDeLotes = registroDeLotes;
    this.generadorDePdf = generadorDePdf;
  }

  @Transactional(readOnly = true)
  public List<ElementoPorRevisar> bandeja() {
    List<Documento> pendientes =
        documentos.findByEstadoOrderByRegistradoEnAscIdAsc(EstadoDocumento.PENDIENTE);
    // Cada lote se agrupa donde aparece su documento más antiguo.
    Map<Long, List<Documento>> porLote = new LinkedHashMap<>();
    List<Object> orden = new ArrayList<>();
    for (Documento documento : pendientes) {
      if (documento.getLote() == null) {
        orden.add(documento);
      } else {
        porLote
            .computeIfAbsent(
                documento.getLote().getId(),
                id -> {
                  orden.add(id);
                  return new ArrayList<>();
                })
            .add(documento);
      }
    }
    return orden.stream()
        .map(
            elemento -> {
              if (elemento instanceof Documento documento) {
                return ElementoPorRevisar.de(documento);
              }
              List<Documento> delLote = porLote.get((Long) elemento);
              return ElementoPorRevisar.deLote(
                  delLote.getFirst(),
                  delLote.size(),
                  delLote.stream().allMatch(Documento::isRevisado));
            })
        .toList();
  }

  /** Abre un documento pendiente para revisarlo y registra la revisión (RF22). */
  @Transactional
  public DocumentoRespuesta revisarDocumento(String nombreUsuario, String codigo) {
    Usuario director = registro.cuenta(nombreUsuario);
    Documento documento =
        documentos
            .findByCodigo(codigo)
            .filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE)
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, NO_PENDIENTE));
    registrarRevision(documento, director, "Revisado por " + director.getNombreCompleto());
    return DocumentoRespuesta.de(documento, registro.firmante());
  }

  /**
   * Abre un lote para revisarlo. Ver el certificado de ejemplo y la relación cuenta como revisión
   * de todos sus documentos pendientes (RF22).
   */
  @Transactional
  public LoteRespuesta revisarLote(String nombreUsuario, String numero) {
    Usuario director = registro.cuenta(nombreUsuario);
    Lote lote =
        lotes
            .findByNumero(numero)
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, LOTE_NO_PENDIENTE));
    List<Documento> pendientes =
        documentos.findByLoteIdOrderById(lote.getId()).stream()
            .filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE)
            .toList();
    if (pendientes.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, LOTE_NO_PENDIENTE);
    }
    for (Documento documento : pendientes) {
      registrarRevision(
          documento,
          director,
          "Revisado con el Lote %s por %s".formatted(numero, director.getNombreCompleto()));
    }
    return registroDeLotes.respuesta(lote);
  }

  private void registrarRevision(Documento documento, Usuario director, String detalle) {
    if (documentos.marcarRevisado(documento.getId(), director, OffsetDateTime.now()) == 1) {
      historial.save(
          new HistorialDocumento(
              documento.getId(), EventoDocumento.REVISADO, detalle, director.getId()));
    }
  }

  /**
   * Muestra del PDF final de un documento pendiente (HU16), con la fecha de hoy y la marca "MUESTRA
   * – SIN VALOR". No se guarda ni se registra: el PDF definitivo se genera al firmar (HU11).
   */
  @Transactional(readOnly = true)
  public PdfFinal muestraDelPdf(String codigo) {
    Documento documento =
        documentos
            .findByCodigo(codigo)
            .filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE)
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, NO_PENDIENTE));
    return generadorDePdf.generar(
        documento, registro.firmante(), LocalDate.now(ZoneId.of("America/Lima")), true);
  }
}
