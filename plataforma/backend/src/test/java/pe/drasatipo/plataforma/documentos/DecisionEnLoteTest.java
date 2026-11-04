package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
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

/**
 * HU12 (DRA-23): observar o rechazar certificados de un lote, o el lote completo, y firmar el
 * resto.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class DecisionEnLoteTest {

  private static int dni = 70_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private MockHttpSession area() throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(
        mvc, jdbc, codificador, "AREA_ENCARGADA", "CAPACITACION");
  }

  /** Un lote revisado por el Director; devuelve su número y sus códigos en orden. */
  private record LoteRevisado(String numero, List<String> codigos) {}

  private LoteRevisado lote(MockHttpSession director, int cantidad) throws Exception {
    String filas =
        IntStream.range(0, cantidad)
            .mapToObj(
                i ->
                    "{\"nombres\": \"Juan\", \"apellidos\": \"Pari\", \"dni\": \"%d\"}"
                        .formatted(++dni))
            .collect(Collectors.joining(","));
    String numero =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        area(),
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Manejo de plagas",
                                   "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                                   "duracionHoras": "16", "lugar": "Río Negro",
                                   "areaOrganizadora": "Área de Capacitación"},
                         "beneficiarios": [%s]}
                        """
                            .formatted(filas))
                    .andExpect(status().isCreated())),
            "$.numero");
    List<String> codigos =
        JsonPath.read(
            cuerpo(
                mvc.perform(post("/api/revision/lotes/" + numero).with(csrf()).session(director))
                    .andExpect(status().isOk())),
            "$.documentos[*].codigo");
    return new LoteRevisado(numero, codigos);
  }

  private ResultActions decidir(
      MockHttpSession sesion, String numero, String accion, List<String> codigos, String motivo)
      throws Exception {
    String lista =
        codigos == null
            ? "null"
            : codigos.stream().map(c -> '"' + c + '"').collect(Collectors.joining(",", "[", "]"));
    return mvc.perform(
        post("/api/revision/lotes/%s/%s".formatted(numero, accion))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"codigos\": %s, \"motivo\": %s}"
                    .formatted(lista, motivo == null ? "null" : '"' + motivo + '"')));
  }

  private String estado(String codigo) {
    return jdbc.queryForObject(
        "SELECT estado || '|' || coalesce(motivo, '') FROM documento WHERE codigo = ?",
        String.class,
        codigo);
  }

  private List<String> eventos(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento || '|' || coalesce(h.detalle, '') FROM documento_historial h"
            + " JOIN documento d ON d.id = h.documento_id WHERE d.codigo = ? ORDER BY h.id",
        String.class,
        codigo);
  }

  @Test
  void observaYRechazaCertificadosElegidosConSuMotivo() throws Exception {
    MockHttpSession director =
        PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
    LoteRevisado lote = lote(director, 4);
    String dniErrado = "El DNI no coincide con la lista de asistencia del taller";

    decidir(director, lote.numero(), "observacion", List.of(lote.codigos().get(1)), dniErrado)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos[1].estado").value("OBSERVADO"))
        .andExpect(jsonPath("$.documentos[1].motivo").value(dniErrado))
        .andExpect(jsonPath("$.documentos[0].estado").value("PENDIENTE"));
    decidir(director, lote.numero(), "rechazo", List.of(lote.codigos().get(2)), "No asistió")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos[2].estado").value("RECHAZADO"));

    assertThat(estado(lote.codigos().get(1))).isEqualTo("OBSERVADO|" + dniErrado);
    assertThat(eventos(lote.codigos().get(1)).getLast()).startsWith("OBSERVADO|Observado por ");
    assertThat(eventos(lote.codigos().get(1)).getLast()).endsWith(": " + dniErrado);
    assertThat(eventos(lote.codigos().get(2)).getLast()).startsWith("RECHAZADO|Rechazado por ");

    // Solo cambian los Pendientes: rechazar uno ya observado no lo toca.
    decidir(director, lote.numero(), "rechazo", List.of(lote.codigos().get(1)), "Otro motivo")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos[1].estado").value("OBSERVADO"));
    assertThat(eventos(lote.codigos().get(1))).filteredOn(e -> e.startsWith("RECHAZADO")).isEmpty();

    // En la bandeja quedan los 2 Pendientes del lote.
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.lote == '%s')].cantidad".formatted(lote.numero())).value(2));

    // El área ve cuántos hay en cada estado y el motivo de cada uno.
    MockHttpSession area = area();
    mvc.perform(get("/api/documentos").session(area))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].estado".formatted(lote.numero())).value("PENDIENTE"))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].estados.PENDIENTE".formatted(lote.numero())).value(2))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].estados.OBSERVADO".formatted(lote.numero())).value(1))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].estados.RECHAZADO".formatted(lote.numero())).value(1));
    mvc.perform(get("/api/lotes/" + lote.numero()).session(area))
        .andExpect(jsonPath("$.documentos[1].motivo").value(dniErrado));
    mvc.perform(get("/api/documentos/" + lote.codigos().get(2)).session(area))
        .andExpect(jsonPath("$.estado").value("RECHAZADO"))
        .andExpect(jsonPath("$.motivo").value("No asistió"));
  }

  @Test
  void firmarElLoteSoloPreparaLosQueSiguenPendientes() throws Exception {
    MockHttpSession director =
        PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
    LoteRevisado lote = lote(director, 3);
    decidir(director, lote.numero(), "observacion", List.of(lote.codigos().get(0)), "Revisar")
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/firma/preparacion")
                .with(csrf())
                .session(director)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"lotes\": [\"%s\"]}".formatted(lote.numero())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preparados.length()").value(2))
        .andExpect(jsonPath("$.preparados[0].codigo").value(lote.codigos().get(1)));
    assertThat(estado(lote.codigos().get(0))).startsWith("OBSERVADO|");
  }

  @Test
  void observarElLoteCompletoLoSacaDePorRevisar() throws Exception {
    MockHttpSession director =
        PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
    LoteRevisado lote = lote(director, 3);
    decidir(director, lote.numero(), "observacion", null, "Falta la lista de asistencia firmada")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos[0].estado").value("OBSERVADO"))
        .andExpect(jsonPath("$.documentos[2].estado").value("OBSERVADO"));
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.lote == '%s')]".formatted(lote.numero())).isEmpty());
    // Ya no tiene Pendientes: no se puede volver a decidir ni abrir para revisar.
    decidir(director, lote.numero(), "rechazo", List.of(), "Otro").andExpect(status().isNotFound());
    mvc.perform(post("/api/revision/lotes/" + lote.numero()).with(csrf()).session(director))
        .andExpect(status().isNotFound());

    LoteRevisado otro = lote(director, 2);
    decidir(director, otro.numero(), "rechazo", List.of(), "El evento no se realizó")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.documentos[0].estado").value("RECHAZADO"))
        .andExpect(jsonPath("$.documentos[1].estado").value("RECHAZADO"));
  }

  @Test
  void elMotivoEsObligatorioYSoloElDirectorDecide() throws Exception {
    MockHttpSession director =
        PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
    LoteRevisado lote = lote(director, 2);
    LoteRevisado otro = lote(director, 1);
    decidir(director, lote.numero(), "observacion", null, "   ")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.SIN_MOTIVO));
    decidir(director, lote.numero(), "rechazo", null, null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.SIN_MOTIVO));
    decidir(director, lote.numero(), "observacion", null, "x".repeat(501))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.MOTIVO_LARGO));
    decidir(director, lote.numero(), "observacion", otro.codigos(), "Motivo")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigos").value(RevisionDelDirector.NO_ES_DEL_LOTE));
    decidir(director, "2099-999", "observacion", null, "Motivo").andExpect(status().isNotFound());
    // Un motivo de 500 caracteres, el máximo, entra completo en el historial.
    decidir(director, otro.numero(), "rechazo", null, "y".repeat(500)).andExpect(status().isOk());

    decidir(area(), lote.numero(), "observacion", null, "Motivo").andExpect(status().isForbidden());
    decidir(
            RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "ADMINISTRADOR", null),
            lote.numero(),
            "rechazo",
            null,
            "Motivo")
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/revision/lotes/%s/observacion".formatted(lote.numero()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"x\"}"))
        .andExpect(status().isUnauthorized());
    assertThat(estado(lote.codigos().get(0))).isEqualTo("PENDIENTE|");
  }
}
