package pe.drasatipo.plataforma.consulta;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;

/** Consulta interna de Mesa de Partes (E5): busca en los documentos de todas las áreas. */
@RestController
@RequestMapping("/api/consulta")
public class ConsultaController {

  private final BusquedaDeDocumentos busqueda;
  private final FichaDeDocumentos fichas;
  private final AuditoriaDeDocumentos auditorias;
  private final EntregaDeDocumentos entregas;

  public ConsultaController(
      BusquedaDeDocumentos busqueda,
      FichaDeDocumentos fichas,
      AuditoriaDeDocumentos auditorias,
      EntregaDeDocumentos entregas) {
    this.busqueda = busqueda;
    this.fichas = fichas;
    this.auditorias = auditorias;
    this.entregas = entregas;
  }

  /** HU22 (RF42): busca por nombre, DNI, código, expediente o lote, con un filtro por estado. */
  @GetMapping("/documentos")
  @PreAuthorize("hasAuthority('DOCUMENTO_BUSCAR')")
  public ResultadoDeBusqueda buscar(
      @RequestParam(defaultValue = "") String texto,
      @RequestParam(defaultValue = "TODOS") FiltroDeEstado estado) {
    return busqueda.buscar(texto, estado);
  }

  /** HU23 (RF43): el estado y los datos básicos de un documento de cualquier área. */
  @GetMapping("/documentos/{codigo}")
  @PreAuthorize("hasAuthority('DOCUMENTO_BUSCAR')")
  public FichaDelDocumento ficha(@PathVariable String codigo) {
    return fichas.ficha(codigo);
  }

  /** HU24 (RF44): el historial y el detalle técnico de auditoría de un documento. */
  @GetMapping("/documentos/{codigo}/auditoria")
  @PreAuthorize("hasAuthority('AUDITORIA_VER')")
  public AuditoriaDelDocumento auditoria(@PathVariable String codigo) {
    return auditorias.auditoria(codigo);
  }

  /** HU25: "Ver documento", el PDF final comprobado con la blockchain, sin registrar nada. */
  @GetMapping("/documentos/{codigo}/pdf")
  @PreAuthorize("hasAuthority('DOCUMENTO_IMPRIMIR')")
  public ResponseEntity<byte[]> ver(@PathVariable String codigo) {
    return pdf(entregas.ver(codigo), ContentDisposition.inline(), codigo);
  }

  /** La forma de entrega de HU25. */
  public record SolicitudDeEntrega(FormaDeEntrega forma) {}

  /** HU25 (RF45): descarga o impresión del PDF comprobado; queda en el historial. */
  @PostMapping("/documentos/{codigo}/entregas")
  @PreAuthorize("hasAuthority('DOCUMENTO_IMPRIMIR')")
  public ResponseEntity<byte[]> entregar(
      @PathVariable String codigo,
      @RequestBody SolicitudDeEntrega solicitud,
      Authentication sesion) {
    if (solicitud == null || solicitud.forma() == null) {
      throw new DatosInvalidosException(Map.of("forma", "Indique IMPRESION o DESCARGA."));
    }
    byte[] contenido = entregas.entregar(sesion.getName(), codigo, solicitud.forma());
    return pdf(
        contenido,
        solicitud.forma() == FormaDeEntrega.DESCARGA
            ? ContentDisposition.attachment()
            : ContentDisposition.inline(),
        codigo);
  }

  private static ResponseEntity<byte[]> pdf(
      byte[] contenido, ContentDisposition.Builder disposicion, String codigo) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .cacheControl(CacheControl.noStore())
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            disposicion.filename(codigo + ".pdf").build().toString())
        .body(contenido);
  }
}
