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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU10 (DRA-21): bandeja "Por revisar" del Director y registro de la revisión (RF21, RF22). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class BandejaPorRevisarTest {

  private static int dni = 50_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  private static String leer(org.springframework.test.web.servlet.ResultActions r, String ruta)
      throws Exception {
    return JsonPath.read(
        r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8), ruta);
  }

  private String documento() throws Exception {
    return leer(
        enviar(
                mvc,
                sesion("AREA_ENCARGADA", "ADMINISTRACION"),
                "/api/documentos",
                trabajo(expedienteNuevo()))
            .andExpect(status().isCreated()),
        "$.codigo");
  }

  private String lote(int cantidad) throws Exception {
    StringBuilder filas = new StringBuilder();
    for (int i = 0; i < cantidad; i++) {
      filas
          .append(i == 0 ? "" : ",")
          .append(
              "{\"nombres\": \"Ana\", \"apellidos\": \"Soto\", \"dni\": \"%d\"}".formatted(++dni));
    }
    return leer(
        enviar(
                mvc,
                sesion("AREA_ENCARGADA", "CAPACITACION"),
                "/api/lotes",
                """
                {"tipo": "CERTIFICADO_CAPACITACION",
                 "datos": {"nombreEvento": "Buenas prácticas de cosecha de cacao",
                           "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                           "duracionHoras": "16", "lugar": "Pampa Hermosa",
                           "areaOrganizadora": "Área de Capacitación"},
                 "beneficiarios": [%s]}
                """
                    .formatted(filas))
            .andExpect(status().isCreated()),
        "$.numero");
  }

  private List<Object> bandeja(MockHttpSession director) throws Exception {
    return JsonPath.read(
        mvc.perform(get("/api/revision").session(director))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$");
  }

  private static int posicion(List<Object> bandeja, String clave, String valor) {
    for (int i = 0; i < bandeja.size(); i++) {
      if (valor.equals(((java.util.Map<?, ?>) bandeja.get(i)).get(clave))) {
        return i;
      }
    }
    return -1;
  }

  @Test
  void listaLosPendientesDelMasAntiguoAlMasRecienteConLosLotesEnUnaFila() throws Exception {
    String primero = documento();
    String numero = lote(3);
    String ultimo = documento();
    MockHttpSession director = sesion("DIRECTOR", null);
    List<Object> bandeja = bandeja(director);

    assertThat(posicion(bandeja, "codigo", primero))
        .isLessThan(posicion(bandeja, "lote", numero))
        .isGreaterThanOrEqualTo(0);
    assertThat(posicion(bandeja, "lote", numero)).isLessThan(posicion(bandeja, "codigo", ultimo));
    // El lote es un solo elemento, con el evento y la cantidad de certificados (RF21).
    assertThat(bandeja.stream().filter(e -> numero.equals(((java.util.Map<?, ?>) e).get("lote"))))
        .hasSize(1);
    mvc.perform(get("/api/revision").session(director))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].evento".formatted(numero))
                .value("Buenas prácticas de cosecha de cacao"))
        .andExpect(jsonPath("$[?(@.lote == '%s')].cantidad".formatted(numero)).value(3))
        .andExpect(jsonPath("$[?(@.lote == '%s')].revisado".formatted(numero)).value(false))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].numeroExpediente".formatted(primero)).exists())
        .andExpect(
            jsonPath("$[?(@.codigo == '%s')].areaNombre".formatted(primero))
                .value("Área de Administración"));
  }

  @Test
  void abrirUnDocumentoRegistraLaRevisionUnaSolaVez() throws Exception {
    String codigo = documento();
    MockHttpSession director = sesion("DIRECTOR", null);
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].revisado".formatted(codigo)).value(false));

    for (int vez = 0; vez < 2; vez++) {
      mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.codigo").value(codigo))
          .andExpect(jsonPath("$.texto").exists());
    }

    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].revisado".formatted(codigo)).value(true));
    assertThat(
            jdbc.queryForList(
                "SELECT h.detalle FROM documento_historial h JOIN documento d ON d.id ="
                    + " h.documento_id WHERE d.codigo = ? AND h.evento = 'REVISADO'",
                String.class,
                codigo))
        .hasSize(1)
        .allMatch(detalle -> detalle.startsWith("Revisado por Persona "));
    assertThat(
            jdbc.queryForObject(
                "SELECT revisado_por IS NOT NULL AND revisado_en IS NOT NULL FROM documento"
                    + " WHERE codigo = ?",
                Boolean.class,
                codigo))
        .isTrue();
  }

  @Test
  void dosAperturasSimultaneasRegistranUnaSolaRevision() throws Exception {
    // En desarrollo, React abre la pantalla dos veces casi a la vez: solo una debe registrarla.
    String codigo = documento();
    MockHttpSession director = sesion("DIRECTOR", null);
    java.util.concurrent.CountDownLatch salida = new java.util.concurrent.CountDownLatch(1);
    java.util.concurrent.ExecutorService hilos =
        java.util.concurrent.Executors.newFixedThreadPool(4);
    List<java.util.concurrent.Future<Integer>> envios = new java.util.ArrayList<>();
    for (int i = 0; i < 4; i++) {
      envios.add(
          hilos.submit(
              () -> {
                salida.await();
                return mvc.perform(
                        post("/api/revision/documentos/" + codigo).with(csrf()).session(director))
                    .andReturn()
                    .getResponse()
                    .getStatus();
              }));
    }
    salida.countDown();
    for (java.util.concurrent.Future<Integer> envio : envios) {
      assertThat(envio.get()).isEqualTo(200);
    }
    hilos.shutdown();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento_historial h JOIN documento d ON d.id ="
                    + " h.documento_id WHERE d.codigo = ? AND h.evento = 'REVISADO'",
                Integer.class,
                codigo))
        .isEqualTo(1);
  }

  @Test
  void abrirUnLoteCuentaComoRevisionDeTodosSusDocumentos() throws Exception {
    String numero = lote(4);
    MockHttpSession director = sesion("DIRECTOR", null);
    mvc.perform(post("/api/revision/lotes/" + numero).with(csrf()).session(director))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.numero").value(numero))
        .andExpect(jsonPath("$.documentos.length()").value(4))
        .andExpect(jsonPath("$.ejemplo.texto").exists());

    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.lote == '%s')].revisado".formatted(numero)).value(true));
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento d JOIN lote l ON l.id = d.lote_id"
                    + " WHERE l.numero = ? AND d.revisado_en IS NOT NULL",
                Integer.class,
                numero))
        .isEqualTo(4);
  }

  @Test
  void unDocumentoOLoteQueNoExisteNoSeAbre() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    mvc.perform(post("/api/revision/documentos/DRA-2026-ZZZZZZ").with(csrf()).session(director))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("Este documento no está pendiente de revisión."));
    mvc.perform(post("/api/revision/lotes/1999-999").with(csrf()).session(director))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("Este lote no está pendiente de revisión."));
  }

  @Test
  void permisosDeLasRutas() throws Exception {
    String codigo = documento();
    mvc.perform(get("/api/revision")).andExpect(status().isUnauthorized());
    for (String[] cuenta :
        new String[][] {
          {"ADMINISTRADOR", null}, {"AREA_ENCARGADA", "ADMINISTRACION"}, {"CONSULTA_INTERNA", null}
        }) {
      MockHttpSession otra = sesion(cuenta[0], cuenta[1]);
      mvc.perform(get("/api/revision").session(otra)).andExpect(status().isForbidden());
      mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(otra))
          .andExpect(status().isForbidden());
    }
    assertThat(
            jdbc.queryForObject(
                "SELECT revisado_en IS NULL FROM documento WHERE codigo = ?",
                Boolean.class,
                codigo))
        .isTrue();
  }
}
