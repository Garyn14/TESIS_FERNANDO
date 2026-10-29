package pe.drasatipo.plataforma.usuarios;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

  boolean existsByRolCodigo(String codigoRol);

  boolean existsByNombreUsuarioIgnoreCase(String nombreUsuario);

  Optional<Usuario> findByNombreUsuarioIgnoreCase(String nombreUsuario);

  @EntityGraph(attributePaths = {"rol", "area"})
  List<Usuario> findAllByOrderByCreadoEnDesc();

  /** Cuenta con su rol ya cargado, para usarla fuera de una transacción (filtro de sesión). */
  @EntityGraph(attributePaths = {"rol", "area"})
  Optional<Usuario> findConRolById(Long id);

  /**
   * Cuentas activas de un rol, bloqueadas hasta el fin de la transacción. Evita que dos solicitudes
   * simultáneas dejen el sistema sin Administradores activos (HU02).
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  List<Usuario> findByRolCodigoAndActivoTrue(String codigoRol);
}
