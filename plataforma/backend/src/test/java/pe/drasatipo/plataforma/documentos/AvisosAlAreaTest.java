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
import pe.drasatipo.plataforma.avisos.Avisos;
import pe.drasatipo.plataforma.avisos.TipoDeAviso;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU27 (DRA-40): avisos de resultado al Área encargada (RF47). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AvisosAlAreaTest {

  private static final String MOTIVO = "El cargo no coincide con el contrato.";
  private static int dni = 74_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired Avisos avisos;

  private DocumentosDePrueba prueba;

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
  void unFirmadoAvisaACadaPersonaDelAreaYANadieMas() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    MockHttpSession companera = prueba.area("ADMINISTRACION");
    MockHttpSession otraArea = prueba.area("CAPACITACION");
    MockHttpSession mesaDePartes =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null);

    String codigo = prueba.revisado(director, area);
    String tx = prueba.firmar(director, codigo);
    prueba.confirmar(director, tx, 1);
    // Repetir la confirmación no genera otro aviso.
    prueba.confirmar(director, tx, 1);

    String enlace = "mis-documentos/" + codigo;
    for (MockHttpSession persona : List.of(area, companera)) {
      assertThat(avisosDe(persona, enlace))
          .singleElement()
          .satisfies(a -> {
            assertThat(a.get("tipo")).isEqualTo("FIRMADO");
            assertThat(a.get("texto"))
                .isEqualTo("Firmado: Certificado de Trabajo – Lucía Paredes Quinto");
            assertThat(a.get("leido")).isEqualTo(false);
          });
    }
    for (MockHttpSession nadie : List.of(otraArea, mesaDePartes, director.sesion())) {
      assertThat(
              avisosDe(nadie, enlace).stream()
                  .filter(a -> !"PENDIENTE_REVISION".equals(a.get("tipo"))))
          .isEmpty();
    }
  }

  @Test
  void observadoYRechazadoLlevanElMotivo() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String observado = prueba.revisado(director, area);
    String rechazado = prueba.revisado(director, area);
    mvc.perform(
            post("/api/revision/documentos/%s/observacion".formatted(observado))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"%s\"}".formatted(MOTIVO)))
        .andExpect(status().isOk());
    decidir(director, rechazado, "rechazo");

    assertThat(textos(avisosDe(area, "mis-documentos/" + observado)))
        .containsExactly(
            "Observado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: " + MOTIVO);
    assertThat(textos(avisosDe(area, "mis-documentos/" + rechazado)))
        .containsExactly(
            "Rechazado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: " + MOTIVO);
  }

  @Test
  void unaDecisionSobreUnLoteEsUnSoloAvisoConLaCantidad() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("CAPACITACION");
    LoteRevisado lote = lote(director, 3);
    mvc.perform(
            post("/api/revision/lotes/%s/observacion".formatted(lote.numero()))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"codigos\": [\"%s\", \"%s\"], \"motivo\": \"%s\"}"
                        .formatted(lote.codigos().get(0), lote.codigos().get(1), MOTIVO)))
        .andExpect(status().isOk());

    assertThat(
            textos(avisosDe(area, "mis-documentos/lote/" + lote.numero())).stream()
                .filter(t -> t.toString().contains("observado")))
        .containsExactly(
            "Lote %s – Manejo de viveros de café: 2 certificados observados. Motivo: %s"
                .formatted(lote.numero(), MOTIVO));
  }

  @Test
  void laFirmaDeUnLoteEsUnSoloAvisoConLaCantidad() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("CAPACITACION");
    LoteRevisado lote = lote(director, 3);
    String tx = prueba.firmar(director, lote.codigos().toArray(String[]::new));
    prueba.confirmar(director, tx, 3);

    assertThat(
            avisosDe(area, "mis-documentos/lote/" + lote.numero()).stream()
                .filter(a -> "FIRMADO".equals(a.get("tipo"))))
        .singleElement()
        .extracting(a -> a.get("texto"))
        .isEqualTo(
            "Lote %s – Manejo de viveros de café: 3 certificados firmados"
                .formatted(lote.numero()));
  }

  @Test
  void unAvisoConLaMismaClaveSeActualizaYVuelveASinLeer() throws Exception {
    MockHttpSession area = prueba.area("CAPACITACION");
    short capacitacion =
        jdbc.queryForObject("SELECT id FROM area WHERE codigo = 'CAPACITACION'", Short.class);
    String enlace = "mis-documentos/lote/2099-" + (++dni);
    avisos.aArea(
        capacitacion, TipoDeAviso.FIRMADO, "Lote X: 1 certificado firmado", enlace, "clave-" + dni);
    mvc.perform(post("/api/avisos/lectura").with(csrf()).session(area))
        .andExpect(status().isNoContent());
    avisos.aArea(
        capacitacion,
        TipoDeAviso.FIRMADO,
        "Lote X: 3 certificados firmados",
        enlace,
        "clave-" + dni);

    assertThat(avisosDe(area, enlace))
        .singleElement()
        .satisfies(a -> {
          assertThat(a.get("texto")).isEqualTo("Lote X: 3 certificados firmados");
          assertThat(a.get("leido")).isEqualTo(false);
        });
  }

  @Test
  void laReemisionFirmadaAvisaElFirmadoYElAnuladoDelOriginal() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String original = prueba.firmado(director, area);
    String nuevo = prueba.reemitido(area, original);
    prueba.revisar(director, nuevo);
    prueba.confirmar(director, prueba.firmar(director, nuevo), 1);

    assertThat(textos(avisosDe(area, "mis-documentos/" + nuevo)))
        .containsExactly("Firmado: Certificado de Trabajo – Lucía Paredes Quintana");
    assertThat(
            avisosDe(area, "mis-documentos/" + original).stream()
                .filter(a -> "ANULADO".equals(a.get("tipo"))))
        .singleElement()
        .extracting(a -> a.get("texto").toString())
        .asString()
        .startsWith(
            "Anulado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: Reemplazado por "
                + nuevo);
  }
}
