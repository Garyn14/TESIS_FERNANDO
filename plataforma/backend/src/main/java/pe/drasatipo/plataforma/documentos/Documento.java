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

  /** Lote de la emisión por lista (HU09); nulo para los de solicitud de parte. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lote_id", updatable = false)
  private Lote lote;

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

  /** Documento a solicitud de parte (HU08). */
  Documento(
      String codigo,
      String tokenQr,
      SolicitudValidada solicitud,
      Area area,
      String dniHmac,
      Usuario registradoPor) {
    this(
        codigo,
        tokenQr,
        solicitud.tipo(),
        area,
        null,
        solicitud.numeroExpediente(),
        new Beneficiario(solicitud.nombres(), solicitud.apellidos(), solicitud.dni()),
        dniHmac,
        solicitud.datos(),
        solicitud.texto(),
        registradoPor);
  }

  /** Documento de un beneficiario de una emisión por lista (HU09). */
  Documento(String codigo, String tokenQr, Lote lote, Beneficiario beneficiario, String dniHmac) {
    this(
        codigo,
        tokenQr,
        lote.getTipo(),
        lote.getArea(),
        lote,
        null,
        beneficiario,
        dniHmac,
        lote.getDatos(),
        lote.getTexto(),
        lote.getRegistradoPor());
  }

  private Documento(
      String codigo,
      String tokenQr,
      TipoDocumento tipo,
      Area area,
      Lote lote,
      String numeroExpediente,
      Beneficiario beneficiario,
      String dniHmac,
      Map<String, String> datos,
      String texto,
      Usuario registradoPor) {
    this.codigo = codigo;
    this.tokenQr = tokenQr;
    this.tipo = tipo;
    this.area = area;
    this.origen = tipo.getOrigen();
    this.lote = lote;
    this.numeroExpediente = numeroExpediente;
    this.nombres = beneficiario.nombres();
    this.apellidos = beneficiario.apellidos();
    this.dni = beneficiario.dni();
    this.dniHmac = dniHmac;
    this.datos = Map.copyOf(datos);
    this.texto = texto;
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

  public Lote getLote() {
    return lote;
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
