package pe.drasatipo.plataforma.documentos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.drasatipo.plataforma.areas.Area;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.usuarios.Usuario;

/** Emisión por lista (HU09): los datos del evento, comunes a los documentos del lote. */
@Entity
@Table(name = "lote")
public class Lote {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, updatable = false)
  private String numero;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "tipo_documento_id", updatable = false)
  private TipoDocumento tipo;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "area_id", updatable = false)
  private Area area;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, updatable = false)
  private Map<String, String> datos;

  @Column(nullable = false, updatable = false)
  private String texto;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "registrado_por", updatable = false)
  private Usuario registradoPor;

  @Column(name = "registrado_en", nullable = false, updatable = false)
  private OffsetDateTime registradoEn = OffsetDateTime.now();

  protected Lote() {}

  Lote(String numero, LoteValidado lote, Area area, Usuario registradoPor) {
    this.numero = numero;
    this.tipo = lote.tipo();
    this.area = area;
    this.datos = Map.copyOf(lote.datos());
    this.texto = lote.texto();
    this.registradoPor = registradoPor;
  }

  public Long getId() {
    return id;
  }

  public String getNumero() {
    return numero;
  }

  public TipoDocumento getTipo() {
    return tipo;
  }

  public Area getArea() {
    return area;
  }

  public Map<String, String> getDatos() {
    return datos;
  }

  public String getTexto() {
    return texto;
  }

  public Usuario getRegistradoPor() {
    return registradoPor;
  }

  public OffsetDateTime getRegistradoEn() {
    return registradoEn;
  }
}
