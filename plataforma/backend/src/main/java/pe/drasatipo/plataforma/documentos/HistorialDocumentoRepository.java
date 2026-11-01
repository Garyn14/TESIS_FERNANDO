package pe.drasatipo.plataforma.documentos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistorialDocumentoRepository extends JpaRepository<HistorialDocumento, Long> {

  List<HistorialDocumento> findByDocumentoIdOrderByRealizadoEn(Long documentoId);
}
