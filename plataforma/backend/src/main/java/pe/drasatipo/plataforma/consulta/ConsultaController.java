package pe.drasatipo.plataforma.consulta;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.areas.AlcanceDeArea;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;

/**
 * Consulta interna de Mesa de Partes (E5): busca en los documentos de todas las áreas. Desde
 * DRA-58, Mesa de Partes de área solo ve los de su área: un documento de otra área responde igual
 * que uno inexistente (RF05).
 */
@RestController
@RequestMapping("/api/consulta")
public class ConsultaController {

  private final BusquedaDeDocumentos busqueda;
  private final FichaDeDocumentos fichas;
  private final AuditoriaDeDocumentos auditorias;
  private final EntregaDeDocumentos entregas;
  private final AlcanceDeArea alcance;
  private final NamedParameterJdbcTemplate jdbc;

  public ConsultaController(
      BusquedaDeDocumentos busqueda,
      FichaDeDocumentos fichas,
      AuditoriaDeDocumentos auditorias,
      EntregaDeDocumentos entregas,
      AlcanceDeArea alcance,
      NamedParameterJdbcTemplate jdbc) {
    this.busqueda = busqueda;
    this.fichas = fichas;
    this.auditorias = auditorias;
    this.entregas = entregas;
    this.alcance = alcance;
    this.jdbc = jdbc;
  }

  /** El área a la que se limita la sesión, o null si ve todas las áreas (DRA-58). */
  private Short areaDe(Authentication sesion) {
    return alcance.areaDeConsulta(sesion.getName()).orElse(null);
  }

  /**
   * Si la sesión está limitada a un área y el documento es de otra, responde como si no existiera.
   * Si no existe, sigue de largo: cada consulta responde su propio 404.
   */
  private void exigirVisible(Authentication sesion, String codigo) {
    Short area = areaDe(sesion);
    if (area == null) {
      return;
    }
    boolean deOtraArea =
        !jdbc.queryForList(
                "SELECT 1 FROM documento WHERE codigo = :codigo AND area_id <> :area",
                Map.of("codigo", codigo, "area", area))
            .isEmpty();
    if (deOtraArea) {
      throw new ReglaDeNegocioException(
          HttpStatus.NOT_FOUND, null, FichaDeDocumentos.NO_ENCONTRADO.formatted(codigo));
    }
  }

  /** HU22 (RF42): busca por nombre, DNI, código, expediente o lote, con un filtro por estado. */
  @GetMapping("/documentos")
  @PreAuthorize("hasAuthority('DOCUMENTO_BUSCAR')")
  public ResultadoDeBusqueda buscar(
      @RequestParam(defaultValue = "") String texto,
      @RequestParam(defaultValue = "TODOS") FiltroDeEstado estado,
      Authentication sesion) {
    return busqueda.buscar(texto, estado, areaDe(sesion));
  }

  /** HU23 (RF43): el estado y los datos básicos de un documento de cualquier área. */
  @GetMapping("/documentos/{codigo}")
  @PreAuthorize("hasAuthority('DOCUMENTO_BUSCAR')")
  public FichaDelDocumento ficha(@PathVariable String codigo, Authentication sesion) {
    exigirVisible(sesion, codigo);
    return fichas.ficha(codigo);
  }

  /** HU24 (RF44): el historial y el detalle técnico de auditoría de un documento. */
  @GetMapping("/documentos/{codigo}/auditoria")
  @PreAuthorize("hasAuthority('AUDITORIA_VER')")
  public AuditoriaDelDocumento auditoria(@PathVariable String codigo, Authentication sesion) {
    exigirVisible(sesion, codigo);
    return auditorias.auditoria(codigo);
  }

  /** HU25: "Ver documento", el PDF final comprobado con la blockchain, sin registrar nada. */
  @GetMapping("/documentos/{codigo}/pdf")
  @PreAuthorize("hasAuthority('DOCUMENTO_IMPRIMIR')")
  public ResponseEntity<byte[]> ver(@PathVariable String codigo, Authentication sesion) {
    exigirVisible(sesion, codigo);
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
    exigirVisible(sesion, codigo);
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
