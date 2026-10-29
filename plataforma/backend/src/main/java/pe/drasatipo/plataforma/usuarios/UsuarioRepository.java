package pe.drasatipo.plataforma.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

  boolean existsByRolCodigo(String codigoRol);

  boolean existsByNombreUsuario(String nombreUsuario);
}
