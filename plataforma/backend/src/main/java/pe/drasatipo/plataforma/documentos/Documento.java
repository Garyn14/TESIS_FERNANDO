package pe.drasatipo.plataforma.documentos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * Documento registrado por el Área encargada (HU08). Mientras está Pendiente no tiene ningún método
 * para modificarse (RF20): todos sus campos se fijan al registrarlo.
 */
@Entity
@Table(name = "documento")
public class Documento {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, updatable = false)
  private String codigo;

  @Column(name = "token_qr", nullable = false, unique = true, updatable = false)
  private String tokenQr;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "tipo_documento_id", updatable = false)
  private TipoDocumento tipo;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "area_id", updatable = false)
  private Area area;

  @Column(nullable = false, updatable = false)
  private String origen;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private EstadoDocumento estado = EstadoDocumento.PENDIENTE;

  @Column(name = "numero_expediente", updatable = false)
  private String numeroExpediente;

  @Column(nullable = false, updatable = false)
  private String nombres;

  @Column(nullable = false, updatable = false)
  private String apellidos;

  @Column(nullable = false, updatable = false)
  private String dni;

  @Column(name = "dni_hmac", nullable = false, updatable = false)
  private String dniHmac;

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

  protected Documento() {}

  Documento(
      String codigo,
      String tokenQr,
      SolicitudValidada solicitud,
      Area area,
      String dniHmac,
      Usuario registradoPor) {
    this.codigo = codigo;
    this.tokenQr = tokenQr;
    this.tipo = solicitud.tipo();
    this.area = area;
    this.origen = solicitud.tipo().getOrigen();
    this.numeroExpediente = solicitud.numeroExpediente();
    this.nombres = solicitud.nombres();
    this.apellidos = solicitud.apellidos();
    this.dni = solicitud.dni();
    this.dniHmac = dniHmac;
    this.datos = Map.copyOf(solicitud.datos());
    this.texto = solicitud.texto();
    this.registradoPor = registradoPor;
  }

  public Long getId() {
    return id;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getTokenQr() {
    return tokenQr;
  }

  public TipoDocumento getTipo() {
    return tipo;
  }

  public Area getArea() {
    return area;
  }

  public String getOrigen() {
    return origen;
  }

  public EstadoDocumento getEstado() {
    return estado;
  }

  public String getNumeroExpediente() {
    return numeroExpediente;
  }

  public String getNombres() {
    return nombres;
  }

  public String getApellidos() {
    return apellidos;
  }

  public String getBeneficiario() {
    return nombres + " " + apellidos;
  }

  public String getDni() {
    return dni;
  }

  public String getDniHmac() {
    return dniHmac;
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
