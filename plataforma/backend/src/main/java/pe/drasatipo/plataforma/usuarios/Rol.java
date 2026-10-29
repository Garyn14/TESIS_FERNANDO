package pe.drasatipo.plataforma.usuarios;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Rol del sistema (RF01). El catálogo se carga en la migración V3. */
@Entity
@Table(name = "rol")
public class Rol {

  public static final String ADMINISTRADOR = "ADMINISTRADOR";

  @Id private Short id;
  private String codigo;
  private String nombre;
  private String descripcion;

  protected Rol() {}

  public Short getId() {
    return id;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getNombre() {
    return nombre;
  }

  public String getDescripcion() {
    return descripcion;
  }
}
