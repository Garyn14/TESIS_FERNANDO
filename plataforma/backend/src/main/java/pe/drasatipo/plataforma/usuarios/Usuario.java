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

/** Cuenta de usuario (RF01–RF03). La gestión completa se implementa en HU01–HU05. */
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

  @Column(name = "creado_en", nullable = false, insertable = false, updatable = false)
  private OffsetDateTime creadoEn;

  protected Usuario() {}

  public Usuario(
      String nombreUsuario,
      String nombreCompleto,
      String contrasenaHash,
      Rol rol,
      boolean debeCambiarContrasena) {
    this.nombreUsuario = nombreUsuario;
    this.nombreCompleto = nombreCompleto;
    this.contrasenaHash = contrasenaHash;
    this.rol = rol;
    this.debeCambiarContrasena = debeCambiarContrasena;
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
}
