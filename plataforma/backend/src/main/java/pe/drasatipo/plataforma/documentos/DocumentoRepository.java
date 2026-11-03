package pe.drasatipo.plataforma.documentos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.drasatipo.plataforma.usuarios.Usuario;

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

  /**
   * Registra la primera revisión (HU10, RF22) en una sola sentencia: si dos solicitudes llegan a la
   * vez, PostgreSQL deja pasar solo a una. Devuelve 1 si esta solicitud la registró.
   */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.revisadoPor = :director, d.revisadoEn = :ahora"
          + " WHERE d.id = :id AND d.revisadoEn IS NULL")
  int marcarRevisado(
      @Param("id") Long id,
      @Param("director") Usuario director,
      @Param("ahora") OffsetDateTime ahora);
}
