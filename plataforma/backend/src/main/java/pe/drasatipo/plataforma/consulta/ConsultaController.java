package pe.drasatipo.plataforma.consulta;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Consulta interna de Mesa de Partes (E5): busca en los documentos de todas las áreas. */
@RestController
@RequestMapping("/api/consulta")
public class ConsultaController {

  private final BusquedaDeDocumentos busqueda;

  public ConsultaController(BusquedaDeDocumentos busqueda) {
    this.busqueda = busqueda;
  }

  /** HU22 (RF42): busca por nombre, DNI, código, expediente o lote, con un filtro por estado. */
  @GetMapping("/documentos")
  @PreAuthorize("hasAuthority('DOCUMENTO_BUSCAR')")
  public ResultadoDeBusqueda buscar(
      @RequestParam(defaultValue = "") String texto,
      @RequestParam(defaultValue = "TODOS") FiltroDeEstado estado) {
    return busqueda.buscar(texto, estado);
  }
}
