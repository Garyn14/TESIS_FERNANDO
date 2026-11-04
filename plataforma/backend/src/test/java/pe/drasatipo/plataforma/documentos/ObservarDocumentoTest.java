package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.expedienteNuevo;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.trabajo;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
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
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU13 (DRA-27): el Director observa un documento con un motivo y vuelve al Área encargada. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class ObservarDocumentoTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private MockHttpSession area() throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(
        mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
  }

  private MockHttpSession director() throws Exception {
    return PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
  }

  private String documento() throws Exception {
    return JsonPath.read(
        enviar(mvc, area(), "/api/documentos", trabajo(expedienteNuevo()))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$.codigo");
  }

  private ResultActions observar(MockHttpSession sesion, String codigo, String motivo)
      throws Exception {
    return mvc.perform(
        post("/api/revision/documentos/%s/observacion".formatted(codigo))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"motivo\": %s}".formatted(motivo == null ? "null" : '"' + motivo + '"')));
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap("SELECT estado, motivo FROM documento WHERE codigo = ?", codigo);
  }

  private List<Map<String, Object>> historial(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento, h.detalle, u.nombre_completo FROM documento_historial h"
            + " JOIN documento d ON d.id = h.documento_id"
            + " LEFT JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = ? ORDER BY h.id",
        codigo);
  }

  @Test
  void elDocumentoObservadoVuelveAlAreaConSuMotivoEnElHistorial() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    String motivo = "El cargo no coincide con el contrato de trabajo";

    observar(director, codigo, "  " + motivo + " ")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("OBSERVADO"))
        .andExpect(jsonPath("$.motivo").value(motivo));

    assertThat(fila(codigo)).containsEntry("estado", "OBSERVADO").containsEntry("motivo", motivo);
    Map<String, Object> evento = historial(codigo).getLast();
    assertThat(evento.get("evento")).isEqualTo("OBSERVADO");
    assertThat((String) evento.get("detalle"))
        .isEqualTo("Observado por %s: %s".formatted(evento.get("nombre_completo"), motivo));

    // Sale de Por revisar y el área lo ve Observado, con el motivo.
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')]".formatted(codigo)).isEmpty());
    MockHttpSession area = area();
    mvc.perform(get("/api/documentos").session(area))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].estado".formatted(codigo)).value("OBSERVADO"));
    mvc.perform(get("/api/documentos/" + codigo).session(area))
        .andExpect(jsonPath("$.estado").value("OBSERVADO"))
        .andExpect(jsonPath("$.motivo").value(motivo));
  }

  @Test
  void elMotivoEsObligatorioYDeHasta500Caracteres() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    for (String vacio : new String[] {null, "", "   "}) {
      observar(director, codigo, vacio)
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.SIN_MOTIVO));
    }
    observar(director, codigo, "x".repeat(501))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.MOTIVO_LARGO));
    observar(director, codigo, "x".repeat(500)).andExpect(status().isOk());
  }

  @Test
  void soloSeObservaUnDocumentoPendiente() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    observar(director, codigo, "Primera observación").andExpect(status().isOk());
    observar(director, codigo, "Otra")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value(RevisionDelDirector.NO_PENDIENTE));
    assertThat(historial(codigo)).filteredOn(e -> "OBSERVADO".equals(e.get("evento"))).hasSize(1);

    // Uno que se está firmando no se observa.
    String enFirma = documento();
    mvc.perform(post("/api/revision/documentos/" + enFirma).with(csrf()).session(director))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/firma/preparacion")
                .with(csrf())
                .session(director)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigos\": [\"%s\"]}".formatted(enFirma)))
        .andExpect(jsonPath("$.preparados.length()").value(1));
    observar(director, enFirma, "Tarde").andExpect(status().isNotFound());
    assertThat(fila(enFirma)).containsEntry("estado", "PROCESANDO_FIRMA");

    observar(director, "DRA-2026-NOEXIS", "Motivo").andExpect(status().isNotFound());
  }

  @Test
  void soloElDirectorObserva() throws Exception {
    String codigo = documento();
    observar(area(), codigo, "Motivo").andExpect(status().isForbidden());
    observar(
            RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "ADMINISTRADOR", null),
            codigo,
            "Motivo")
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/revision/documentos/%s/observacion".formatted(codigo))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"x\"}"))
        .andExpect(status().isUnauthorized());
    assertThat(fila(codigo)).containsEntry("estado", "PENDIENTE");
  }
}
