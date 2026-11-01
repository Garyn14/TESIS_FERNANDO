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

  protected TipoDocumento() {}

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
