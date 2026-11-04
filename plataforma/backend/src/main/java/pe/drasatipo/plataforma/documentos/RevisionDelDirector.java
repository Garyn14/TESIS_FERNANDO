package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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
  private final jakarta.persistence.EntityManager entidades;

  public RevisionDelDirector(
      DocumentoRepository documentos,
      LoteRepository lotes,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      RegistroDeLotes registroDeLotes,
      GeneradorDePdf generadorDePdf,
      jakarta.persistence.EntityManager entidades) {
    this.documentos = documentos;
    this.lotes = lotes;
    this.historial = historial;
    this.registro = registro;
    this.registroDeLotes = registroDeLotes;
    this.generadorDePdf = generadorDePdf;
    this.entidades = entidades;
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
                  delLote.stream().allMatch(Documento::isRevisado),
                  delLote.stream().anyMatch(Documento::isCorregido));
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

  static final String SIN_MOTIVO = "Indique el motivo.";
  static final String MOTIVO_LARGO = "El motivo puede tener hasta 500 caracteres.";
  static final String NO_ES_DEL_LOTE = "Uno de los certificados indicados no es de este lote.";

  /**
   * HU12 (RF24–RF27): observa o rechaza certificados Pendientes de un lote con un motivo. Sin
   * códigos, se aplica a todos los Pendientes del lote. Los que ya no están Pendientes no cambian.
   */
  @Transactional
  public LoteRespuesta decidirEnLote(
      String nombreUsuario,
      String numero,
      List<String> codigos,
      String motivo,
      EstadoDocumento decision) {
    String texto = motivoValido(motivo);
    Usuario director = registro.cuenta(nombreUsuario);
    Lote lote =
        lotes
            .findByNumero(numero)
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, LOTE_NO_PENDIENTE));
    List<Documento> delLote = documentos.findByLoteIdOrderById(lote.getId());
    List<Documento> pendientes =
        delLote.stream().filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE).toList();
    if (pendientes.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, LOTE_NO_PENDIENTE);
    }
    List<Documento> elegidos = pendientes;
    if (codigos != null && !codigos.isEmpty()) {
      Set<String> delLoteCodigos =
          delLote.stream().map(Documento::getCodigo).collect(Collectors.toSet());
      if (!delLoteCodigos.containsAll(codigos)) {
        throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", NO_ES_DEL_LOTE);
      }
      Set<String> pedidos = Set.copyOf(codigos);
      elegidos = pendientes.stream().filter(d -> pedidos.contains(d.getCodigo())).toList();
    }
    for (Documento documento : elegidos) {
      registrarDecision(documento, decision, texto, director);
    }
    // Las sentencias de actualización no pasan por las entidades ya cargadas.
    entidades.clear();
    return registroDeLotes.respuesta(lotes.findByNumero(numero).orElseThrow());
  }

  /**
   * HU13 (RF24, RF25): observa un documento Pendiente con un motivo; vuelve al Área encargada. HU14
   * (RF26): lo rechaza con un motivo; es definitivo, porque solo un Pendiente se decide o se firma.
   */
  @Transactional
  public DocumentoRespuesta decidirEnDocumento(
      String nombreUsuario, String codigo, String motivo, EstadoDocumento decision) {
    String texto = motivoValido(motivo);
    Usuario director = registro.cuenta(nombreUsuario);
    Documento documento =
        documentos
            .findByCodigo(codigo)
            .filter(d -> d.getEstado() == EstadoDocumento.PENDIENTE)
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, NO_PENDIENTE));
    if (!registrarDecision(documento, decision, texto, director)) {
      // Cambió de estado entre la lectura y la decisión (por ejemplo, empezó a firmarse).
      throw new ReglaDeNegocioException(HttpStatus.NOT_FOUND, null, NO_PENDIENTE);
    }
    entidades.clear();
    return DocumentoRespuesta.de(
        documentos.findByCodigo(codigo).orElseThrow(), registro.firmante());
  }

  static String motivoValido(String motivo) {
    String texto = motivo == null ? "" : motivo.strip();
    if (texto.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "motivo", SIN_MOTIVO);
    }
    if (texto.length() > 500) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "motivo", MOTIVO_LARGO);
    }
    return texto;
  }

  /** Observa o rechaza un documento si sigue Pendiente, y lo deja en su historial. */
  private boolean registrarDecision(
      Documento documento, EstadoDocumento decision, String texto, Usuario director) {
    boolean observar = decision == EstadoDocumento.OBSERVADO;
    if (documentos.decidir(documento.getId(), decision, texto) != 1) {
      return false;
    }
    historial.save(
        new HistorialDocumento(
            documento.getId(),
            observar ? EventoDocumento.OBSERVADO : EventoDocumento.RECHAZADO,
            "%s por %s: %s"
                .formatted(
                    observar ? "Observado" : "Rechazado", director.getNombreCompleto(), texto),
            director.getId()));
    return true;
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
