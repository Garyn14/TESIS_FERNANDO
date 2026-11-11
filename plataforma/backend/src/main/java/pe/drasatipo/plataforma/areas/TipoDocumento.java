package pe.drasatipo.plataforma.areas;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Tipo de documento que emite la agencia (sección 1.1.2 de la tesis). Catálogo de la V3. */
@Entity
@Table(name = "tipo_documento")
public class TipoDocumento {

  @Id private Short id;
  private String codigo;
  private String nombre;
  private String descripcion;
  private String titulo;
  private String origen;
  private boolean activo;

  /** DRA-62: meses de vigencia de los documentos que se firmen, o null si no vencen. */
  private Short vigenciaMeses;

  protected TipoDocumento() {}

  public Short getVigenciaMeses() {
    return vigenciaMeses;
  }

  /**
   * DRA-62: la fecha hasta la que es válido (inclusive) un documento de este tipo emitido en {@code
   * fechaEmision}, o null si no vence.
   */
  public java.time.LocalDate venceEn(java.time.LocalDate fechaEmision) {
    return vigenciaMeses == null ? null : fechaEmision.plusMonths(vigenciaMeses);
  }

  public Short getId() {
    return id;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getNombre() {
    return nombre;
  }

  /** Texto breve para la pantalla "Nuevo documento" (HU07). */
  public String getDescripcion() {
    return descripcion;
  }

  /** CERTIFICADO o CONSTANCIA. */
  public String getTitulo() {
    return titulo;
  }

  /** SOLICITUD_PARTE (individual) u OFICIO (por lista). */
  public String getOrigen() {
    return origen;
  }

  public boolean isActivo() {
    return activo;
  }
}
