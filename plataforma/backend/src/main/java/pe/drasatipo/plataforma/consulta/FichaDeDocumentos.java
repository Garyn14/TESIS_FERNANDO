package pe.drasatipo.plataforma.consulta;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.documentos.Documento;
import pe.drasatipo.plataforma.documentos.DocumentoRepository;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;
import pe.drasatipo.plataforma.documentos.EventoDocumento;
import pe.drasatipo.plataforma.documentos.HistorialDocumentoRepository;

/** Ficha de un documento de cualquier área para Mesa de Partes (HU23, RF43). */
@Service
public class FichaDeDocumentos {

  static final String NO_ENCONTRADO = "No se encontró el documento %s.";

  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;

  public FichaDeDocumentos(DocumentoRepository documentos, HistorialDocumentoRepository historial) {
    this.documentos = documentos;
    this.historial = historial;
  }

  @Transactional(readOnly = true)
  public FichaDelDocumento ficha(String codigo) {
    Documento documento =
        documentos
            .findByCodigo(codigo)
            .orElseThrow(() ->
                new ReglaDeNegocioException(
                    HttpStatus.NOT_FOUND, null, NO_ENCONTRADO.formatted(codigo)));
    // HU30: la reemisión vigente (no rechazada) está en revisión o ya lo reemplazó.
    Documento reemision = documentos.reemisionVigente(documento.getId()).orElse(null);
    boolean reemplazado =
        reemision != null
            && (reemision.getEstado() == EstadoDocumento.FIRMADO
                || reemision.getEstado() == EstadoDocumento.ANULADO);
    EstadoDocumento estado = documento.getEstado();
    String motivo =
        switch (estado) {
          case OBSERVADO, RECHAZADO -> documento.getMotivo();
          case ANULADO -> documento.getMotivoAnulacion();
          default -> null;
        };
    return new FichaDelDocumento(
        documento.getCodigo(),
        documento.getTipo().getNombre(),
        documento.getOrigen(),
        estado,
        documento.getBeneficiario(),
        documento.getDni(),
        documento.getNumeroExpediente(),
        documento.getArea().getNombre(),
        documento.getLote() == null ? null : documento.getLote().getNumero(),
        documento.getLote() == null ? null : documento.getLote().getDatos().get("nombreEvento"),
        documento.getRegistradoEn(),
        motivo,
        documento.getFirmadoEn(),
        documento.getAnuladoEn(),
        documento.isReemision() ? documento.getReemplazaA().getCodigo() : null,
        reemision == null || reemplazado ? null : reemision.getCodigo(),
        reemplazado ? reemision.getCodigo() : null,
        historial.countByDocumentoIdAndEvento(documento.getId(), EventoDocumento.IMPRESO),
        historial.countByDocumentoIdAndEvento(documento.getId(), EventoDocumento.DESCARGADO));
  }
}
