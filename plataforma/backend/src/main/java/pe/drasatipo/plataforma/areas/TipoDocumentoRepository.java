package pe.drasatipo.plataforma.areas;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TipoDocumentoRepository extends JpaRepository<TipoDocumento, Short> {

  List<TipoDocumento> findByActivoTrueOrderByNombre();
}
