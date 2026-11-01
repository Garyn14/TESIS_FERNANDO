package pe.drasatipo.plataforma.usuarios;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

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

  Optional<Usuario> findByBilleteraIgnoreCase(String billetera);

  /** HU08: el Director cuyo nombre va en la firma de la vista previa. */
  Optional<Usuario> findFirstByRolCodigoAndActivoTrueOrderByCreadoEn(String codigoRol);

  /** HU06: cuentas con rol Director o con billetera registrada (aunque ya no sean Director). */
  @EntityGraph(attributePaths = {"rol", "area"})
  @Query(
      "SELECT u FROM Usuario u WHERE u.rol.codigo = 'DIRECTOR' OR u.billetera IS NOT NULL"
          + " ORDER BY u.nombreCompleto")
  List<Usuario> directoresYCuentasConBilletera();
}
