package pe.drasatipo.plataforma.consulta;

import java.util.List;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;

/** Filtros por estado de Buscar documentos (HU22). */
public enum FiltroDeEstado {
  TODOS(List.of(EstadoDocumento.values())),
  /** Lo que todavía no termina: falta la decisión o la firma del Director, o una corrección. */
  EN_TRAMITE(
      List.of(
          EstadoDocumento.PENDIENTE, EstadoDocumento.PROCESANDO_FIRMA, EstadoDocumento.OBSERVADO)),
  FIRMADOS(List.of(EstadoDocumento.FIRMADO)),
  ANULADOS(List.of(EstadoDocumento.ANULADO)),
  RECHAZADOS(List.of(EstadoDocumento.RECHAZADO));

  private final List<EstadoDocumento> estados;

  FiltroDeEstado(List<EstadoDocumento> estados) {
    this.estados = estados;
  }

  public List<String> nombres() {
    return estados.stream().map(Enum::name).toList();
  }
}
