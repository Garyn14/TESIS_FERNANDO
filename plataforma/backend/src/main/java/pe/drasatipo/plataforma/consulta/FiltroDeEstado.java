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
  RECHAZADOS(List.of(EstadoDocumento.RECHAZADO)),
  /** HU25: firmados que Mesa de Partes todavía no imprimió ni descargó. */
  LISTOS_PARA_ENTREGAR(List.of(EstadoDocumento.FIRMADO), true);

  private final List<EstadoDocumento> estados;
  private final boolean sinEntregar;

  FiltroDeEstado(List<EstadoDocumento> estados) {
    this(estados, false);
  }

  FiltroDeEstado(List<EstadoDocumento> estados, boolean sinEntregar) {
    this.estados = estados;
    this.sinEntregar = sinEntregar;
  }

  /** Si solo incluye los documentos que nunca se imprimieron ni se descargaron. */
  public boolean sinEntregar() {
    return sinEntregar;
  }

  public List<String> nombres() {
    return estados.stream().map(Enum::name).toList();
  }
}
