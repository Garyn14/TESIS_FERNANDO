package pe.drasatipo.plataforma.documentos;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoteRepository extends JpaRepository<Lote, Long> {

  /** Lotes ya numerados en un año, para el correlativo (2026-001, 2026-002...). */
  long countByNumeroStartingWith(String prefijo);

  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor"})
  Optional<Lote> findByNumero(String numero);
}
