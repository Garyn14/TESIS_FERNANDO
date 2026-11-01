package pe.drasatipo.plataforma.documentos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Un evento del historial de un documento. Nunca se modifica ni se elimina. */
@Entity
@Table(name = "documento_historial")
public class HistorialDocumento {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "documento_id", nullable = false, updatable = false)
  private Long documentoId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private EventoDocumento evento;

  @Column(updatable = false)
  private String detalle;

  @Column(name = "realizado_por", nullable = false, updatable = false)
  private Long realizadoPor;

  @Column(name = "realizado_en", nullable = false, updatable = false)
  private OffsetDateTime realizadoEn = OffsetDateTime.now();

  protected HistorialDocumento() {}

  public HistorialDocumento(
      Long documentoId, EventoDocumento evento, String detalle, Long realizadoPor) {
    this.documentoId = documentoId;
    this.evento = evento;
    this.detalle = detalle;
    this.realizadoPor = realizadoPor;
  }

  public EventoDocumento getEvento() {
    return evento;
  }

  public String getDetalle() {
    return detalle;
  }
}
