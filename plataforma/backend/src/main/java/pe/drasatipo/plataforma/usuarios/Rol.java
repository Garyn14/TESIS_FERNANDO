package pe.drasatipo.plataforma.usuarios;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Rol del sistema (RF01). El catálogo se carga en la migración V3. */
@Entity
@Table(name = "rol")
public class Rol {

  public static final String ADMINISTRADOR = "ADMINISTRADOR";
  public static final String AREA_ENCARGADA = "AREA_ENCARGADA";
  public static final String DIRECTOR = "DIRECTOR";
  public static final String MESA_PARTES_AREA = "MESA_PARTES_AREA";

  @Id private Short id;
  private String codigo;
  private String nombre;
  private String descripcion;

  /** DRA-58: el rol exige un área y solo accede a lo de ella (RF05). */
  private boolean limitadoAlArea;

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

  public boolean isLimitadoAlArea() {
    return limitadoAlArea;
  }
}
