package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
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
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU28 (DRA-41): avisos de entrega y de rechazo a Mesa de Partes (RF48). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AvisosAMesaDePartesTest {

  private static final String MOTIVO = "El cargo no coincide con el contrato.";
  private static int dni = 75_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private DocumentosDePrueba prueba;

  private MockHttpSession mesaDePartes() throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null);
  }

  private String expediente(String codigo) {
    return jdbc.queryForObject(
        "SELECT numero_expediente FROM documento WHERE codigo = ?", String.class, codigo);
  }

  @BeforeEach
  void preparar() {
    prueba = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private List<Map<String, Object>> avisosDe(MockHttpSession sesion, String enlace)
      throws Exception {
    List<Map<String, Object>> todos =
        JsonPath.read(cuerpo(mvc.perform(get("/api/avisos").session(sesion))), "$.avisos");
    return todos.stream().filter(a -> enlace.equals(a.get("enlace"))).toList();
  }

  private static List<Object> textos(List<Map<String, Object>> avisos) {
    return avisos.stream().map(a -> a.get("texto")).toList();
  }

  private void decidir(DocumentosDePrueba.Director director, String codigo, String accion)
      throws Exception {
    prueba.revisar(director, codigo);
    mvc.perform(
            post("/api/revision/documentos/%s/%s".formatted(codigo, accion))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"%s\"}".formatted(MOTIVO)))
        .andExpect(status().isOk());
  }

  private record LoteRevisado(String numero, List<String> codigos) {}

  private LoteRevisado lote(DocumentosDePrueba.Director director, int cantidad) throws Exception {
    StringBuilder filas = new StringBuilder();
    for (int i = 0; i < cantidad; i++) {
      filas
          .append(i == 0 ? "" : ",")
          .append(
              "{\"nombres\": \"Ana\", \"apellidos\": \"Soto\", \"dni\": \"%d\"}".formatted(++dni));
    }
    String numero =
        JsonPath.read(
            cuerpo(
                RegistroSolicitudDePartePrueba.enviar(
                        mvc,
                        prueba.area("CAPACITACION"),
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Manejo de viveros de café",
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
                mvc.perform(
                        post("/api/revision/lotes/" + numero)
                            .with(csrf())
                            .session(director.sesion()))
                    .andExpect(status().isOk())),
            "$.documentos[*].codigo");
    return new LoteRevisado(numero, codigos);
  }

  @Test
  void unFirmadoLlegaComoListoParaEntregarConSuExpediente() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    MockHttpSession mesa = mesaDePartes();
    MockHttpSession otraMesa = mesaDePartes();
    String codigo = prueba.revisado(director, area);
    String tx = prueba.firmar(director, codigo);
    prueba.confirmar(director, tx, 1);
    prueba.confirmar(director, tx, 1);

    for (MockHttpSession persona : List.of(mesa, otraMesa)) {
      assertThat(avisosDe(persona, "buscar/" + codigo))
          .singleElement()
          .satisfies(a -> {
            assertThat(a.get("tipo")).isEqualTo("LISTO_PARA_ENTREGAR");
            assertThat(a.get("texto"))
                .isEqualTo(
                    "Listo para entregar: Certificado de Trabajo – Lucía Paredes Quinto"
                        + " (expediente %s)".formatted(expediente(codigo)));
          });
    }
    // Ni al área ni al Director.
    for (MockHttpSession nadie : List.of(area, director.sesion())) {
      assertThat(avisosDe(nadie, "buscar/" + codigo)).isEmpty();
    }
  }

  @Test
  void unRechazoLlevaElExpedienteYElMotivoYUnaObservacionNoSeAvisa() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    MockHttpSession mesa = mesaDePartes();
    String rechazado = prueba.revisado(director, area);
    String observado = prueba.revisado(director, area);
    for (String[] decision :
        List.of(new String[] {rechazado, "rechazo"}, new String[] {observado, "observacion"})) {
      mvc.perform(
              post("/api/revision/documentos/%s/%s".formatted(decision[0], decision[1]))
                  .with(csrf())
                  .session(director.sesion())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"motivo\": \"%s\"}".formatted(MOTIVO)))
          .andExpect(status().isOk());
    }

    assertThat(avisosDe(mesa, "buscar/" + rechazado))
        .singleElement()
        .satisfies(a -> {
          assertThat(a.get("tipo")).isEqualTo("RECHAZADO");
          assertThat(a.get("texto"))
              .isEqualTo(
                  "Rechazado: Certificado de Trabajo – Lucía Paredes Quinto (expediente %s)."
                          .formatted(expediente(rechazado))
                      + " Motivo: "
                      + MOTIVO);
        });
    assertThat(avisosDe(mesa, "buscar/" + observado)).isEmpty();
  }

  @Test
  void unLoteEsUnSoloAvisoQueAbreLaBusquedaDelLote() throws Exception {
    var director = prueba.director();
    MockHttpSession mesa = mesaDePartes();
    LoteRevisado lote = lote(director, 3);
    mvc.perform(
            post("/api/revision/lotes/%s/rechazo".formatted(lote.numero()))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"codigos\": [\"%s\"], \"motivo\": \"%s\"}"
                        .formatted(lote.codigos().get(0), MOTIVO)))
        .andExpect(status().isOk());
    String tx = prueba.firmar(director, lote.codigos().get(1), lote.codigos().get(2));
    prueba.confirmar(director, tx, 2);

    assertThat(textos(avisosDe(mesa, "buscar?texto=%s&estado=RECHAZADOS".formatted(lote.numero()))))
        .containsExactly(
            "Rechazado: Lote %s – Manejo de viveros de café: 1 certificado rechazado. Motivo: %s"
                .formatted(lote.numero(), MOTIVO));
    assertThat(textos(avisosDe(mesa, "buscar?texto=" + lote.numero())))
        .containsExactly(
            "Listo para entregar: Lote %s – Manejo de viveros de café: 2 certificados firmados"
                .formatted(lote.numero()));
  }

  @Test
  void unaAnulacionNoSeAvisaAMesaDePartesPeroLaReemisionFirmadaSi() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    MockHttpSession mesa = mesaDePartes();
    String original = prueba.firmado(director, area);
    String nuevo = prueba.reemitido(area, original);
    prueba.revisar(director, nuevo);
    prueba.confirmar(director, prueba.firmar(director, nuevo), 1);

    assertThat(avisosDe(mesa, "buscar/" + original))
        .extracting(a -> a.get("tipo"))
        .containsExactly("LISTO_PARA_ENTREGAR");
    assertThat(textos(avisosDe(mesa, "buscar/" + nuevo)))
        .containsExactly(
            "Listo para entregar: Certificado de Trabajo – Lucía Paredes Quintana (expediente %s)"
                .formatted(expediente(nuevo)));
  }
}
