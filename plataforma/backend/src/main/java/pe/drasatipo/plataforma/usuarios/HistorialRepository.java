package pe.drasatipo.plataforma.usuarios;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistorialRepository extends JpaRepository<RegistroHistorial, Long> {

  List<RegistroHistorial> findByUsuarioIdOrderByIdAsc(Long usuarioId);
}
