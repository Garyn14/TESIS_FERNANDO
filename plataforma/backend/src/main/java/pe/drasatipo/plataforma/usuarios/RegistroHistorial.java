package pe.drasatipo.plataforma.usuarios;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Un evento del historial de una cuenta (RF01, HU02). Nunca se modifica ni se elimina. */
@Entity
@Table(name = "usuario_historial")
public class RegistroHistorial {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "usuario_id", nullable = false, updatable = false)
  private Long usuarioId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private EventoCuenta evento;

  @Column(updatable = false)
  private String detalle;

  @Column(name = "realizado_por", updatable = false)
  private Long realizadoPor;

  @Column(name = "realizado_en", nullable = false, updatable = false)
  private OffsetDateTime realizadoEn = OffsetDateTime.now();

  protected RegistroHistorial() {}

  public RegistroHistorial(Long usuarioId, EventoCuenta evento, String detalle, Long realizadoPor) {
    this.usuarioId = usuarioId;
    this.evento = evento;
    this.detalle = detalle;
    this.realizadoPor = realizadoPor;
  }

  public EventoCuenta getEvento() {
    return evento;
  }

  public String getDetalle() {
    return detalle;
  }

  public Long getRealizadoPor() {
    return realizadoPor;
  }
}
