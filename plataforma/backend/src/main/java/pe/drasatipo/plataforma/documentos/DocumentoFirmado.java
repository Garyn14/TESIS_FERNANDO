package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;

/**
 * Un documento de la pantalla Documentos firmados (HU29): firmado o anulado. Los de un lote llevan
 * su número; la pantalla los agrupa.
 */
public record DocumentoFirmado(
    String codigo,
    String lote,
    String evento,
    String tipoNombre,
    String nombres,
    String apellidos,
    String dni,
    String areaNombre,
    OffsetDateTime firmadoEn,
    EstadoDocumento estado,
    OffsetDateTime anuladoEn,
    String motivoAnulacion) {

  static DocumentoFirmado de(Documento d) {
    return new DocumentoFirmado(
        d.getCodigo(),
        d.getLote() == null ? null : d.getLote().getNumero(),
        d.getLote() == null ? null : d.getLote().getDatos().get("nombreEvento"),
        d.getTipo().getNombre(),
        d.getNombres(),
        d.getApellidos(),
        d.getDni(),
        d.getArea().getNombre(),
        d.getFirmadoEn(),
        d.getEstado(),
        d.getAnuladoEn(),
        d.getMotivoAnulacion());
  }
}
