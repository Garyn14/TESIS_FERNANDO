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

/** HU14 (DRA-28): el Director rechaza un documento con un motivo; el rechazo es definitivo. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class RechazarDocumentoTest {

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

  private ResultActions decidir(MockHttpSession sesion, String codigo, String accion, String motivo)
      throws Exception {
    return mvc.perform(
        post("/api/revision/documentos/%s/%s".formatted(codigo, accion))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"motivo\": %s}".formatted(motivo == null ? "null" : '"' + motivo + '"')));
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap("SELECT estado, motivo FROM documento WHERE codigo = ?", codigo);
  }

  @Test
  void elDocumentoRechazadoQuedaConSuMotivoYSuHistorial() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    String motivo = "El solicitante no trabajó en la agencia en ese periodo";

    decidir(director, codigo, "rechazo", motivo)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("RECHAZADO"))
        .andExpect(jsonPath("$.motivo").value(motivo));
    assertThat(fila(codigo)).containsEntry("estado", "RECHAZADO").containsEntry("motivo", motivo);
    Map<String, Object> evento =
        jdbc.queryForMap(
            "SELECT h.evento, h.detalle, u.nombre_completo FROM documento_historial h"
                + " JOIN documento d ON d.id = h.documento_id"
                + " JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = ?"
                + " ORDER BY h.id DESC LIMIT 1",
            codigo);
    assertThat(evento.get("evento")).isEqualTo("RECHAZADO");
    assertThat(evento.get("detalle"))
        .isEqualTo("Rechazado por %s: %s".formatted(evento.get("nombre_completo"), motivo));

    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')]".formatted(codigo)).isEmpty());
    mvc.perform(get("/api/documentos/" + codigo).session(area()))
        .andExpect(jsonPath("$.estado").value("RECHAZADO"))
        .andExpect(jsonPath("$.motivo").value(motivo));
  }

  @Test
  void elRechazoEsDefinitivo() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    decidir(director, codigo, "rechazo", "No corresponde").andExpect(status().isOk());

    // No se vuelve a rechazar, ni se observa, ni se abre para revisar, ni se firma.
    decidir(director, codigo, "rechazo", "Otra vez").andExpect(status().isNotFound());
    decidir(director, codigo, "observacion", "Corregir").andExpect(status().isNotFound());
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director))
        .andExpect(status().isNotFound());
    mvc.perform(
            post("/api/firma/preparacion")
                .with(csrf())
                .session(director)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigos\": [\"%s\"]}".formatted(codigo)))
        .andExpect(jsonPath("$.preparados.length()").value(0))
        .andExpect(jsonPath("$.noPreparados[0].motivo").value(PreparacionDeFirma.NO_PENDIENTE));
    assertThat(fila(codigo)).containsEntry("estado", "RECHAZADO");

    // Uno observado tampoco se rechaza: vuelve al área para corregirlo (HU15).
    String observado = documento();
    decidir(director, observado, "observacion", "Corregir el cargo").andExpect(status().isOk());
    decidir(director, observado, "rechazo", "No").andExpect(status().isNotFound());
    assertThat(fila(observado)).containsEntry("estado", "OBSERVADO");
  }

  @Test
  void elMotivoEsObligatorioYSoloElDirectorRechaza() throws Exception {
    MockHttpSession director = director();
    String codigo = documento();
    decidir(director, codigo, "rechazo", "  ")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.SIN_MOTIVO));
    decidir(director, codigo, "rechazo", "x".repeat(501))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.MOTIVO_LARGO));
    decidir(area(), codigo, "rechazo", "Motivo").andExpect(status().isForbidden());
    decidir(
            RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null),
            codigo,
            "rechazo",
            "Motivo")
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/revision/documentos/%s/rechazo".formatted(codigo))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"x\"}"))
        .andExpect(status().isUnauthorized());
    assertThat(fila(codigo)).containsEntry("estado", "PENDIENTE");
  }
}
