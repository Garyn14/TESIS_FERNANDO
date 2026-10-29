package pe.drasatipo.plataforma.areas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaRepository extends JpaRepository<Area, Short> {

  @EntityGraph(attributePaths = "tiposDocumento")
  List<Area> findByActivaTrueOrderByNombre();

  Optional<Area> findByCodigoAndActivaTrue(String codigo);
}
