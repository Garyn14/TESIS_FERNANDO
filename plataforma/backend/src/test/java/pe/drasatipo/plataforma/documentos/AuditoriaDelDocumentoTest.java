package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU24 (DRA-37): historial y detalle técnico de auditoría de un documento (RF44). */
@SpringBootTest(
    properties = {
      "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC,
      "plataforma.blockchain.contrato=" + AuditoriaDelDocumentoTest.CONTRATO
    })
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AuditoriaDelDocumentoTest {

  static final String CONTRATO = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private DocumentosDePrueba prueba;
  private MockHttpSession mesaDePartes;

  @BeforeEach
  void preparar() throws Exception {
    prueba = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    mesaDePartes =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null);
  }

  private ResultActions auditoria(String codigo) throws Exception {
    return mvc.perform(
        get("/api/consulta/documentos/%s/auditoria".formatted(codigo)).session(mesaDePartes));
  }

  private List<Map<String, Object>> eventos(String codigo) throws Exception {
    return JsonPath.read(
        auditoria(codigo)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$.eventos");
  }

  private String nombre(MockHttpSession sesion) throws Exception {
    return JsonPath.read(
        mvc.perform(get("/api/sesion").session(sesion))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$.nombreCompleto");
  }

  @Test
  void unFirmadoMuestraCadaEventoConFechaYResponsableYSuDetalleTecnico() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String codigo = prueba.firmado(director, area);

    List<Map<String, Object>> eventos = eventos(codigo);
    assertThat(eventos)
        .extracting(e -> e.get("evento"))
        .containsExactly("REGISTRADO", "REVISADO", "PREPARADO", "FIRMADO");
    assertThat(eventos).allSatisfy(e -> assertThat(e.get("realizadoEn")).isNotNull());
    assertThat(eventos.getFirst())
        .containsEntry("responsable", nombre(area))
        .containsEntry("rol", "Emisor de área");
    assertThat(eventos.getFirst().get("detalle").toString())
        .startsWith("Registrado y enviado a revisión por " + nombre(area));
    assertThat(eventos.getLast())
        .containsEntry("responsable", nombre(director.sesion()))
        .containsEntry("rol", "Director");

    Map<String, Object> fila =
        jdbc.queryForMap(
            "SELECT hash_pdf, cid, transaccion, bloque, billetera_firmante FROM documento"
                + " WHERE codigo = ?",
            codigo);
    auditoria(codigo)
        .andExpect(jsonPath("$.tecnico.hashPdf").value(fila.get("hash_pdf")))
        .andExpect(jsonPath("$.tecnico.cid").value(fila.get("cid")))
        .andExpect(jsonPath("$.tecnico.transaccion").value(fila.get("transaccion")))
        .andExpect(jsonPath("$.tecnico.bloque").value(((Number) fila.get("bloque")).intValue()))
        .andExpect(jsonPath("$.tecnico.billeteraFirmante").value(fila.get("billetera_firmante")))
        .andExpect(jsonPath("$.tecnico.registradoEn").exists())
        .andExpect(jsonPath("$.tecnico.transaccionAnulacion").doesNotExist())
        .andExpect(jsonPath("$.tecnico.contrato").value(CONTRATO));
  }

  @Test
  void unPendienteNoTieneDetalleTecnicoNiDatosSensibles() throws Exception {
    MockHttpSession area = prueba.area("ADMINISTRACION");
    var director = prueba.director();
    String codigo = prueba.revisado(director, area);

    String cuerpo =
        auditoria(codigo)
            .andExpect(jsonPath("$.eventos.length()").value(2))
            .andExpect(jsonPath("$.tecnico.hashPdf").doesNotExist())
            .andExpect(jsonPath("$.tecnico.transaccion").doesNotExist())
            .andExpect(jsonPath("$.tecnico.contrato").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    for (String columna : List.of("dni_hmac", "token_qr")) {
      assertThat(cuerpo)
          .doesNotContain(
              jdbc.queryForObject(
                  "SELECT " + columna + " FROM documento WHERE codigo = ?", String.class, codigo));
    }
  }

  @Test
  void unEventoDelSistemaNoTieneResponsable() throws Exception {
    String codigo = prueba.revisado(prueba.director(), prueba.area("ADMINISTRACION"));
    jdbc.update(
        "INSERT INTO documento_historial (documento_id, evento, detalle, realizado_por)"
            + " SELECT id, 'FIRMA_CANCELADA', 'La firma no se completó en el plazo de 15 minutos.',"
            + " NULL FROM documento WHERE codigo = ?",
        codigo);

    assertThat(eventos(codigo).getLast())
        .containsEntry("evento", "FIRMA_CANCELADA")
        .containsEntry("responsable", null)
        .containsEntry("rol", null)
        .containsEntry("detalle", "La firma no se completó en el plazo de 15 minutos.");
  }

  @Test
  void unAnuladoPorReemisionMuestraLaTransaccionDeAnulacion() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String original = prueba.firmado(director, area);
    String nuevo = prueba.reemitido(area, original);
    prueba.revisar(director, nuevo);
    String tx = prueba.firmar(director, nuevo);
    prueba.confirmar(director, tx, 1);

    assertThat(eventos(original))
        .extracting(e -> e.get("evento"))
        .containsSubsequence("FIRMADO", "REEMISION_SOLICITADA", "ANULADO");
    auditoria(original)
        .andExpect(jsonPath("$.tecnico.transaccionAnulacion").value(tx))
        .andExpect(jsonPath("$.tecnico.bloqueAnulacion").exists())
        .andExpect(jsonPath("$.tecnico.anuladoEn").exists())
        .andExpect(
            jsonPath("$.eventos[-1].detalle")
                .value(Matchers.startsWith("Anulado por reemisión (reemplazado por " + nuevo)));
  }

  @Test
  void unCodigoQueNoExisteResponde404() throws Exception {
    auditoria("DRA-2026-NOEXST")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("No se encontró el documento DRA-2026-NOEXST."));
  }

  @Test
  void soloQuienTieneAuditoriaVerConsultaLaAuditoria() throws Exception {
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String codigo = prueba.revisado(prueba.director(), area);
    String ruta = "/api/consulta/documentos/%s/auditoria".formatted(codigo);
    mvc.perform(get(ruta)).andExpect(status().isUnauthorized());
    mvc.perform(get(ruta).session(area)).andExpect(status().isForbidden());
    mvc.perform(get(ruta).session(prueba.director().sesion())).andExpect(status().isForbidden());
  }
}
