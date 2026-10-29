package pe.drasatipo.plataforma.usuarios;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RolRepository extends JpaRepository<Rol, Short> {

  Optional<Rol> findByCodigo(String codigo);

  /** Códigos de los permisos asignados a un rol (RF04), configurables en la base de datos. */
  @Query(
      value =
          """
          SELECT p.codigo FROM permiso p JOIN rol_permiso rp ON rp.permiso_id = p.id
          WHERE rp.rol_id = :rolId ORDER BY p.codigo
          """,
      nativeQuery = true)
  List<String> codigosDePermisos(Short rolId);
}
