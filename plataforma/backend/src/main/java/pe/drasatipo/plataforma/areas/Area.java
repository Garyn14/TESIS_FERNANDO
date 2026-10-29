package pe.drasatipo.plataforma.areas;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;

/** Área de la agencia y los tipos de documento que está autorizada a emitir (RF06). */
@Entity
@Table(name = "area")
public class Area {

  @Id private Short id;
  private String codigo;
  private String nombre;
  private boolean activa;

  @ManyToMany
  @JoinTable(
      name = "area_tipo_documento",
      joinColumns = @JoinColumn(name = "area_id"),
      inverseJoinColumns = @JoinColumn(name = "tipo_documento_id"))
  @OrderBy("nombre")
  private Set<TipoDocumento> tiposDocumento = new LinkedHashSet<>();

  protected Area() {}

  public Short getId() {
    return id;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getNombre() {
    return nombre;
  }

  public boolean isActiva() {
    return activa;
  }

  public Set<TipoDocumento> getTiposDocumento() {
    return tiposDocumento;
  }
}
