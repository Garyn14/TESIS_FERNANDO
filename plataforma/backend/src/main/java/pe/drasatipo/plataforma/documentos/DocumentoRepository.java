package pe.drasatipo.plataforma.documentos;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {

  boolean existsByCodigo(String codigo);

  boolean existsByNumeroExpediente(String numeroExpediente);

  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor"})
  Optional<Documento> findByCodigo(String codigo);

  /** Mis documentos: los de un área, del más reciente al más antiguo (RF05). */
  @EntityGraph(attributePaths = {"tipo"})
  List<Documento> findByAreaIdOrderByRegistradoEnDesc(Short areaId);
}
