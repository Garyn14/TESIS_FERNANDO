package pe.drasatipo.plataforma.usuarios;

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

/** Cuenta de usuario (RF01–RF03). */
@Entity
@Table(name = "usuario")
public class Usuario {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "nombre_usuario", nullable = false, unique = true)
  private String nombreUsuario;

  @Column(name = "nombre_completo", nullable = false)
  private String nombreCompleto;

  @Column(name = "contrasena_hash", nullable = false)
  private String contrasenaHash;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "rol_id")
  private Rol rol;

  @Column(name = "area_id")
  private Short areaId;

  @Column(nullable = false)
  private boolean activo = true;

  @Column(name = "debe_cambiar_contrasena", nullable = false)
  private boolean debeCambiarContrasena;

  @Column(name = "intentos_fallidos", nullable = false)
  private short intentosFallidos;

  @Column(name = "bloqueada_hasta")
  private OffsetDateTime bloqueadaHasta;

  @Column(name = "creado_en", nullable = false, updatable = false)
  private OffsetDateTime creadoEn = OffsetDateTime.now();

  /** Cuenta que creó esta cuenta. Nulo solo para la primera cuenta de Administrador (RF09). */
  @Column(name = "creado_por", updatable = false)
  private Long creadoPor;

  protected Usuario() {}

  public Usuario(
      String nombreUsuario,
      String nombreCompleto,
      String contrasenaHash,
      Rol rol,
      boolean debeCambiarContrasena,
      Long creadoPor) {
    this.nombreUsuario = nombreUsuario;
    this.nombreCompleto = nombreCompleto;
    this.contrasenaHash = contrasenaHash;
    this.rol = rol;
    this.debeCambiarContrasena = debeCambiarContrasena;
    this.creadoPor = creadoPor;
  }

  public Long getId() {
    return id;
  }

  public String getNombreUsuario() {
    return nombreUsuario;
  }

  public String getNombreCompleto() {
    return nombreCompleto;
  }

  public String getContrasenaHash() {
    return contrasenaHash;
  }

  public Rol getRol() {
    return rol;
  }

  public boolean isActivo() {
    return activo;
  }

  public boolean isDebeCambiarContrasena() {
    return debeCambiarContrasena;
  }

  public OffsetDateTime getCreadoEn() {
    return creadoEn;
  }

  public Long getCreadoPor() {
    return creadoPor;
  }

  /** HU02: el nombre de usuario no cambia porque identifica a la persona en el historial. */
  void actualizar(String nombreCompleto, Rol rol) {
    this.nombreCompleto = nombreCompleto;
    this.rol = rol;
  }

  void desactivar() {
    this.activo = false;
  }

  void reactivar() {
    this.activo = true;
  }

  public boolean estaBloqueada(OffsetDateTime ahora) {
    return bloqueadaHasta != null && bloqueadaHasta.isAfter(ahora);
  }

  public OffsetDateTime getBloqueadaHasta() {
    return bloqueadaHasta;
  }

  public int getIntentosFallidos() {
    return intentosFallidos;
  }

  /**
   * HU03: suma un intento fallido. Al llegar al máximo bloquea la cuenta hasta {@code hasta} y
   * vuelve el contador a cero. Devuelve true si la cuenta quedó bloqueada.
   */
  public boolean registrarIntentoFallido(int maximo, OffsetDateTime hasta) {
    intentosFallidos++;
    if (intentosFallidos < maximo) {
      return false;
    }
    intentosFallidos = 0;
    bloqueadaHasta = hasta;
    return true;
  }

  public void registrarIngresoCorrecto() {
    intentosFallidos = 0;
    bloqueadaHasta = null;
  }
}
