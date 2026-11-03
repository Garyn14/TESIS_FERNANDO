package pe.drasatipo.plataforma.documentos;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {

  boolean existsByCodigo(String codigo);

  boolean existsByNumeroExpediente(String numeroExpediente);

  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor", "lote"})
  Optional<Documento> findByCodigo(String codigo);

  /** Mis documentos: los de un área, del más reciente al más antiguo (RF05). */
  @EntityGraph(attributePaths = {"tipo", "lote"})
  List<Documento> findByAreaIdOrderByRegistradoEnDescIdAsc(Short areaId);

  /** Bandeja "Por revisar": los pendientes, del más antiguo al más reciente (HU10, RF21). */
  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor", "lote"})
  List<Documento> findByEstadoOrderByRegistradoEnAscIdAsc(EstadoDocumento estado);

  /** Documentos de un lote, en el orden de la relación de beneficiarios (HU09). */
  List<Documento> findByLoteIdOrderById(Long loteId);
}
