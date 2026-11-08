package pe.drasatipo.plataforma.documentos;

import java.time.ZoneOffset;
import java.util.List;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.blockchain.AnulacionRegistrada;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Anulación de un documento firmado (HU29, RF49). El servidor guarda el motivo, la billetera del
 * Director envía la anulación al contrato y el servidor la lee en la blockchain antes de marcar el
 * documento como Anulado. Nunca envía transacciones ni conoce claves (RNF05).
 */
@Service
public class AnulacionDeDocumentos {

  static final String NO_FIRMADO = "Solo se anula un documento firmado.";
  static final String SIN_ANULACION =
      "La transacción no se encontró, no se confirmó o no anuló este documento en el contrato.";
  static final String YA_ANULADO =
      "La anulación ya quedó registrada en la blockchain. Se confirmará al sincronizar.";
  static final String CON_REEMISION =
      "Este documento tiene una reemisión en revisión (%s): se anulará cuando se firme la"
          + " reemisión.";
  static final String SIN_MOTIVO_REGISTRADO =
      "Anulado en la blockchain; el motivo no llegó a registrarse en la plataforma.";

  private static final Pattern TRANSACCION = Pattern.compile("^0x[0-9a-fA-F]{64}$");
  private static final Logger LOG = LoggerFactory.getLogger(AnulacionDeDocumentos.class);

  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final RegistroDeDocumentos registro;
  private final UsuarioRepository usuarios;
  private final ContratoRegistro contrato;

  private final AvisosDeResultado avisosDeResultado;

  public AnulacionDeDocumentos(
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      UsuarioRepository usuarios,
      ContratoRegistro contrato,
      AvisosDeResultado avisosDeResultado) {
    this.documentos = documentos;
    this.historial = historial;
    this.registro = registro;
    this.usuarios = usuarios;
    this.contrato = contrato;
    this.avisosDeResultado = avisosDeResultado;
  }

  /** Documentos firmados y anulados, del firmado más reciente al más antiguo. */
  @Transactional(readOnly = true)
  public List<DocumentoFirmado> firmados() {
    java.util.Map<Long, String> enCurso = new java.util.HashMap<>();
    documentos.reemisionesEnCurso().forEach(f -> enCurso.put((Long) f[0], (String) f[1]));
    return documentos
        .findByEstadoInOrderByFirmadoEnDescIdAsc(
            List.of(EstadoDocumento.FIRMADO, EstadoDocumento.ANULADO))
        .stream()
        .map(d -> DocumentoFirmado.de(d, enCurso.get(d.getId())))
        .toList();
  }

  /**
   * Guarda el motivo antes de que la billetera envíe la anulación: así, si el navegador se cierra,
   * la sincronización (HU18) anula con el motivo correcto.
   */
  @Transactional
  public DocumentoFirmado solicitar(String nombreUsuario, String codigo, String motivo) {
    String texto = RevisionDelDirector.motivoValido(motivo);
    Usuario director = registro.cuenta(nombreUsuario);
    verificarFirmante(director);
    Documento documento = firmado(codigo);
    // HU30: con una reemisión en curso, el original se anula al firmarla.
    documentos
        .reemisionVigente(documento.getId())
        .ifPresent(
            r -> {
              throw new ReglaDeNegocioException(
                  HttpStatus.CONFLICT, null, CON_REEMISION.formatted(r.getCodigo()));
            });
    documentos.solicitarAnulacion(documento.getId(), texto, java.time.OffsetDateTime.now());
    return DocumentoFirmado.de(documento);
  }

  /** La billetera avisa su transacción: se lee en la blockchain y el documento pasa a Anulado. */
  @Transactional
  public DocumentoFirmado confirmar(String nombreUsuario, String codigo, String transaccion) {
    if (transaccion == null || !TRANSACCION.matcher(transaccion).matches()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "transaccion", SIN_ANULACION);
    }
    Usuario director = registro.cuenta(nombreUsuario);
    List<AnulacionRegistrada> anulaciones;
    try {
      anulaciones = contrato.anulacionesEn(transaccion);
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
    AnulacionRegistrada anulacion =
        anulaciones.stream()
            .filter(a -> a.codigo().equals(codigo))
            .findFirst()
            .orElseThrow(
                () ->
                    new ReglaDeNegocioException(HttpStatus.CONFLICT, "transaccion", SIN_ANULACION));
    if (!anulacion.firmante().equalsIgnoreCase(String.valueOf(director.getBilletera()))) {
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT, "transaccion", FirmaDeDocumentos.OTRA_BILLETERA);
    }
    aplicar(anulacion, director);
    return documentos.findByCodigo(codigo).map(DocumentoFirmado::de).orElseThrow();
  }

  /**
   * La anulación no se completó (se canceló en la billetera o falló): se descarta el motivo,
   * después de comprobar en el contrato que no quedó registrada.
   */
  @Transactional
  public DocumentoFirmado cancelar(String nombreUsuario, String codigo) {
    registro.cuenta(nombreUsuario);
    Documento documento = firmado(codigo);
    try {
      if (contrato.estaAnulado(codigo)) {
        throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, YA_ANULADO);
      }
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
    documentos.descartarAnulacion(documento.getId());
    return DocumentoFirmado.de(documento);
  }

  /**
   * Aplica una anulación leída en la blockchain (HU29, HU18): un Firmado pasa a Anulado con la
   * fecha del bloque. Repetirlo no cambia nada. Devuelve true si lo anuló ahora.
   */
  boolean aplicar(AnulacionRegistrada anulacion, Usuario director) {
    Documento documento = documentos.findByCodigo(anulacion.codigo()).orElse(null);
    if (documento == null || documento.getEstado() != EstadoDocumento.FIRMADO) {
      if (documento == null || documento.getEstado() != EstadoDocumento.ANULADO) {
        LOG.warn(
            "Inconsistencia: la transacción {} anuló {}, que no está firmado",
            anulacion.transaccion(),
            anulacion.codigo());
      }
      return false;
    }
    Usuario quien =
        director != null
            ? director
            : usuarios.findByBilleteraIgnoreCase(anulacion.firmante()).orElse(null);
    // HU30: una reemisión que se firma anula al original en la misma transacción.
    Documento reemplazo =
        documentos
            .reemisionVigente(documento.getId())
            .filter(
                r ->
                    r.getEstado() == EstadoDocumento.PROCESANDO_FIRMA
                        || r.getEstado() == EstadoDocumento.FIRMADO)
            .orElse(null);
    String porDefecto =
        reemplazo == null
            ? SIN_MOTIVO_REGISTRADO
            : "Reemplazado por %s. Motivo de la reemisión: %s"
                .formatted(reemplazo.getCodigo(), reemplazo.getMotivoReemision());
    if (documentos.marcarAnulado(
            documento.getId(),
            quien,
            anulacion.fecha().atOffset(ZoneOffset.UTC),
            anulacion.transaccion(),
            anulacion.bloque(),
            porDefecto)
        == 0) {
      return false;
    }
    String motivo = documentos.motivoDeAnulacion(documento.getId()).orElse(porDefecto);
    String accion =
        reemplazo == null
            ? "Anulado"
            : "Anulado por reemisión (reemplazado por %s)".formatted(reemplazo.getCodigo());
    historial.save(
        new HistorialDocumento(
            documento.getId(),
            EventoDocumento.ANULADO,
            CambiosDeDatos.limitar(
                "%s por %s con la billetera %s; transacción %s; bloque %d. Motivo: %s"
                    .formatted(
                        director != null
                            ? accion
                            : "Anulación confirmada por la sincronización: "
                                + Character.toLowerCase(accion.charAt(0))
                                + accion.substring(1),
                        quien == null ? "(billetera sin cuenta)" : quien.getNombreCompleto(),
                        anulacion.firmante(),
                        anulacion.transaccion(),
                        anulacion.bloque(),
                        motivo)),
            quien == null ? null : quien.getId()));
    avisosDeResultado.anulado(documento, motivo);
    return true;
  }

  private Documento firmado(String codigo) {
    return documentos
        .findByCodigo(codigo)
        .filter(d -> d.getEstado() == EstadoDocumento.FIRMADO)
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_FIRMADO));
  }

  private void verificarFirmante(Usuario director) {
    if (director.getBilletera() == null) {
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT, null, PreparacionDeFirma.SIN_BILLETERA);
    }
    try {
      if (!contrato.esFirmante(director.getBilletera())) {
        throw new ReglaDeNegocioException(
            HttpStatus.CONFLICT, null, PreparacionDeFirma.NO_ES_FIRMANTE);
      }
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
  }
}
