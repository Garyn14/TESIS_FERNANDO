package pe.drasatipo.plataforma.usuarios;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

  boolean existsByRolCodigo(String codigoRol);

  boolean existsByNombreUsuarioIgnoreCase(String nombreUsuario);

  Optional<Usuario> findByNombreUsuarioIgnoreCase(String nombreUsuario);

  @EntityGraph(attributePaths = "rol")
  List<Usuario> findAllByOrderByCreadoEnDesc();
}
