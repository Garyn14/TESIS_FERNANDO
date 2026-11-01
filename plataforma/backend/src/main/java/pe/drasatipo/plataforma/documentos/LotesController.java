package pe.drasatipo.plataforma.documentos;

import java.io.IOException;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Emisión por lista (HU09). No hay rutas para modificar un lote enviado (RF20). */
@RestController
@RequestMapping("/api/lotes")
public class LotesController {

  private static final MediaType XLSX =
      MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  private final RegistroDeLotes registro;

  public LotesController(RegistroDeLotes registro) {
    this.registro = registro;
  }

  @GetMapping("/plantilla")
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public ResponseEntity<byte[]> plantilla(@RequestParam String tipo, Authentication sesion) {
    return ResponseEntity.ok()
        .contentType(XLSX)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename("plantilla-beneficiarios.xlsx")
                .build()
                .toString())
        .body(registro.plantilla(sesion.getName(), tipo));
  }

  @PostMapping(path = "/importar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public List<Beneficiario> importar(@RequestPart("archivo") MultipartFile archivo)
      throws IOException {
    return registro.importar(archivo.getInputStream());
  }

  @PostMapping("/vista-previa")
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public VistaPreviaLoteRespuesta vistaPrevia(
      @RequestBody SolicitudLote solicitud, Authentication sesion) {
    return registro.vistaPrevia(sesion.getName(), solicitud);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('DOCUMENTO_REGISTRAR')")
  public LoteRespuesta registrar(@RequestBody SolicitudLote solicitud, Authentication sesion) {
    return registro.registrar(sesion.getName(), solicitud);
  }

  @GetMapping("/{numero}")
  @PreAuthorize("hasAuthority('DOCUMENTO_VER_AREA')")
  public LoteRespuesta detalle(@PathVariable String numero, Authentication sesion) {
    return registro.detalle(sesion.getName(), numero);
  }
}
