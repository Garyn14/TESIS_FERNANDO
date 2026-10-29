package pe.drasatipo.plataforma.usuarios;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistorialRepository extends JpaRepository<RegistroHistorial, Long> {

  List<RegistroHistorial> findByUsuarioIdOrderByIdAsc(Long usuarioId);

  /** HU06: evita registrar dos veces la misma transacción (RNF10). */
  boolean existsByUsuarioIdAndDetalleContaining(Long usuarioId, String texto);
}
