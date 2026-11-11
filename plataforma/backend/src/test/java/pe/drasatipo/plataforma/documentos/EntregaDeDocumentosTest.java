package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU25 (DRA-38): Mesa de Partes descarga o imprime un documento firmado (RF45). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class EntregaDeDocumentosTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired AlmacenDeArchivos almacen;

  private DocumentosDePrueba prueba;
  private MockHttpSession mesaDePartes;

  @BeforeEach
  void preparar() throws Exception {
    prueba = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    mesaDePartes =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null);
  }

  private ResultActions entregar(MockHttpSession sesion, String codigo, String forma)
      throws Exception {
    return mvc.perform(
        post("/api/consulta/documentos/%s/entregas".formatted(codigo))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"forma\": \"%s\"}".formatted(forma)));
  }

  private List<Map<String, Object>> entregas(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento, h.detalle FROM documento_historial h JOIN documento d ON d.id ="
            + " h.documento_id WHERE d.codigo = ? AND h.evento IN ('IMPRESO', 'DESCARGADO')"
            + " ORDER BY h.id",
        codigo);
  }

  private String nombre(MockHttpSession sesion) throws Exception {
    return JsonPath.read(
        mvc.perform(get("/api/sesion").session(sesion))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$.nombreCompleto");
  }

  private static String sha256(byte[] contenido) throws Exception {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido));
  }

  @Test
  void verDocumentoEntregaElPdfRegistradoSinAnotarNada() throws Exception {
    String codigo = prueba.firmado(prueba.director(), prueba.area("ADMINISTRACION"));

    byte[] pdf =
        mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(codigo)).session(mesaDePartes))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(
                header().string("Content-Disposition", "inline; filename=\"" + codigo + ".pdf\""))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    String hash =
        jdbc.queryForObject(
            "SELECT hash_pdf FROM documento WHERE codigo = ?", String.class, codigo);
    assertThat(sha256(pdf)).isEqualToIgnoringCase(hash.replaceFirst("^0x", ""));
    assertThat(entregas(codigo)).isEmpty();
  }

  @Test
  void cadaImpresionYDescargaQuedaEnElHistorialSinUnaNuevaFirma() throws Exception {
    String codigo = prueba.firmado(prueba.director(), prueba.area("ADMINISTRACION"));
    Map<String, Object> antes =
        jdbc.queryForMap(
            "SELECT transaccion, hash_pdf, cid, estado FROM documento WHERE codigo = ?", codigo);
    String quien = nombre(mesaDePartes) + " (Mesa de Partes)";

    entregar(mesaDePartes, codigo, "IMPRESION")
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "application/pdf"))
        .andExpect(
            header().string("Content-Disposition", "inline; filename=\"" + codigo + ".pdf\""));
    entregar(mesaDePartes, codigo, "IMPRESION").andExpect(status().isOk());
    entregar(mesaDePartes, codigo, "DESCARGA")
        .andExpect(status().isOk())
        .andExpect(
            header().string("Content-Disposition", "attachment; filename=\"" + codigo + ".pdf\""));

    assertThat(entregas(codigo))
        .extracting(e -> e.get("evento") + "|" + e.get("detalle"))
        .containsExactly(
            "IMPRESO|Impreso por " + quien,
            "IMPRESO|Duplicado impreso por " + quien + ". Impresión n.° 2",
            "DESCARGADO|PDF descargado por " + quien);
    // El mismo documento: ni una transacción nueva ni otro PDF.
    assertThat(
            jdbc.queryForMap(
                "SELECT transaccion, hash_pdf, cid, estado FROM documento WHERE codigo = ?",
                codigo))
        .isEqualTo(antes);
    mvc.perform(get("/api/consulta/documentos/" + codigo).session(mesaDePartes))
        .andExpect(jsonPath("$.impresiones").value(2))
        .andExpect(jsonPath("$.descargas").value(1));
    mvc.perform(
            get("/api/consulta/documentos/%s/auditoria".formatted(codigo)).session(mesaDePartes))
        .andExpect(jsonPath("$.eventos[-1].evento").value("DESCARGADO"))
        .andExpect(jsonPath("$.eventos[-1].rol").value("Mesa de Partes"));
  }

  @Test
  void elFiltroListosParaEntregarQuitaLosYaEntregados() throws Exception {
    String codigo = prueba.firmado(prueba.director(), prueba.area("ADMINISTRACION"));
    String expediente =
        jdbc.queryForObject(
            "SELECT numero_expediente FROM documento WHERE codigo = ?", String.class, codigo);
    String ruta = "/api/consulta/documentos";

    mvc.perform(
            get(ruta)
                .param("texto", expediente)
                .param("estado", "LISTOS_PARA_ENTREGAR")
                .session(mesaDePartes))
        .andExpect(jsonPath("$.filas[0].codigo").value(codigo));
    entregar(mesaDePartes, codigo, "DESCARGA").andExpect(status().isOk());
    mvc.perform(
            get(ruta)
                .param("texto", expediente)
                .param("estado", "LISTOS_PARA_ENTREGAR")
                .session(mesaDePartes))
        .andExpect(jsonPath("$.filas.length()").value(0));
    mvc.perform(
            get(ruta).param("texto", expediente).param("estado", "FIRMADOS").session(mesaDePartes))
        .andExpect(jsonPath("$.filas[0].codigo").value(codigo));
  }

  @Test
  void soloSeEntregaUnDocumentoFirmado() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String pendiente = prueba.revisado(director, area);
    entregar(mesaDePartes, pendiente, "IMPRESION")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("Solo se entrega un documento firmado."));
    mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(pendiente)).session(mesaDePartes))
        .andExpect(status().isConflict());

    String original = prueba.firmado(director, area);
    String nuevo = prueba.reemitido(area, original);
    prueba.revisar(director, nuevo);
    prueba.confirmar(director, prueba.firmar(director, nuevo), 1);
    entregar(mesaDePartes, original, "IMPRESION")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("El documento está anulado: no se puede entregar."));
    assertThat(entregas(pendiente)).isEmpty();
    assertThat(entregas(original)).isEmpty();
    // La reemisión firmada sí se entrega.
    entregar(mesaDePartes, nuevo, "IMPRESION").andExpect(status().isOk());

    entregar(mesaDePartes, "DRA-2026-NOEXST", "IMPRESION").andExpect(status().isNotFound());
  }

  @Test
  void unPdfQueNoCoincideConLaBlockchainNoSeEntrega() throws Exception {
    String codigo = prueba.firmado(prueba.director(), prueba.area("ADMINISTRACION"));
    String otro = almacen.guardar("alterado.pdf", "%PDF-1.7 documento alterado".getBytes());
    jdbc.update("UPDATE documento SET cid = ? WHERE codigo = ?", otro, codigo);

    entregar(mesaDePartes, codigo, "IMPRESION")
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje")
                .value(
                    "El documento no coincide con su registro en la blockchain. No se puede"
                        + " entregar. Comuníquese con el Administrador."));
    assertThat(entregas(codigo)).isEmpty();
  }

  @Test
  void laFormaEsObligatoria() throws Exception {
    String codigo = prueba.firmado(prueba.director(), prueba.area("ADMINISTRACION"));
    mvc.perform(
            post("/api/consulta/documentos/%s/entregas".formatted(codigo))
                .with(csrf())
                .session(mesaDePartes)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.forma").value("Indique IMPRESION o DESCARGA."));
    assertThat(entregas(codigo)).isEmpty();
  }

  @Test
  void soloConsultaInternaDescargaOImprime() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String codigo = prueba.firmado(director, area);
    mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(codigo)))
        .andExpect(status().isUnauthorized());
    for (MockHttpSession otra : List.of(area, director.sesion())) {
      entregar(otra, codigo, "IMPRESION").andExpect(status().isForbidden());
      mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(codigo)).session(otra))
          .andExpect(status().isForbidden());
    }
    assertThat(entregas(codigo)).isEmpty();
  }
}
