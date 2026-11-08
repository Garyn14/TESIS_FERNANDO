package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU26 (DRA-39): aviso al Director cuando un documento queda pendiente de su revisión (RF46). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AvisoPendienteAlDirectorTest {

  private static int dni = 73_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private DocumentosDePrueba prueba;

  @BeforeEach
  void preparar() {
    prueba = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
  }

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  private String cuerpo(org.springframework.test.web.servlet.ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private List<Map<String, Object>> avisos(MockHttpSession sesion) throws Exception {
    return JsonPath.read(
        cuerpo(mvc.perform(get("/api/avisos").session(sesion)).andExpect(status().isOk())),
        "$.avisos");
  }

  private long sinLeer(MockHttpSession sesion) throws Exception {
    return ((Number)
            JsonPath.read(cuerpo(mvc.perform(get("/api/avisos").session(sesion))), "$.sinLeer"))
        .longValue();
  }

  private static List<Map<String, Object>> con(List<Map<String, Object>> avisos, String enlace) {
    return avisos.stream().filter(a -> enlace.equals(a.get("enlace"))).toList();
  }

  private String enviado(MockHttpSession area) throws Exception {
    return JsonPath.read(
        cuerpo(
            RegistroSolicitudDePartePrueba.enviar(
                    mvc,
                    area,
                    "/api/documentos",
                    RegistroSolicitudDePartePrueba.trabajo(
                        RegistroSolicitudDePartePrueba.expedienteNuevo()))
                .andExpect(status().isCreated())),
        "$.codigo");
  }

  @Test
  void unDocumentoEnviadoAvisaACadaDirectorActivo() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    MockHttpSession otroDirector = sesion("DIRECTOR", null);
    MockHttpSession inactivo = sesion("DIRECTOR", null);
    String nombreInactivo =
        JsonPath.read(cuerpo(mvc.perform(get("/api/sesion").session(inactivo))), "$.nombreUsuario");
    jdbc.update("UPDATE usuario SET activo = false WHERE nombre_usuario = ?", nombreInactivo);
    MockHttpSession area = prueba.area("ADMINISTRACION");
    long antes = sinLeer(director);

    String codigo = enviado(area);

    for (MockHttpSession d : List.of(director, otroDirector)) {
      assertThat(con(avisos(d), "por-revisar/" + codigo))
          .singleElement()
          .satisfies(a -> {
            assertThat(a.get("tipo")).isEqualTo("PENDIENTE_REVISION");
            assertThat(a.get("texto"))
                .isEqualTo(
                    "Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto");
            assertThat(a.get("leido")).isEqualTo(false);
            assertThat(a.get("creadoEn")).isNotNull();
          });
    }
    assertThat(sinLeer(director)).isEqualTo(antes + 1);
    // Ni al director inactivo ni al área que lo envió.
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id"
                    + " WHERE u.nombre_usuario = ? AND a.enlace = ?",
                Integer.class,
                nombreInactivo,
                "por-revisar/" + codigo))
        .isZero();
    assertThat(con(avisos(area), "por-revisar/" + codigo)).isEmpty();
  }

  @Test
  void unLoteGeneraUnSoloAvisoConElEventoYLaCantidad() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
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
                         "beneficiarios": [
                           {"nombres": "Ana", "apellidos": "Soto", "dni": "%d"},
                           {"nombres": "Luis", "apellidos": "Rojas", "dni": "%d"},
                           {"nombres": "Edwin", "apellidos": "Pari", "dni": "%d"}]}
                        """
                            .formatted(++dni, ++dni, ++dni))
                    .andExpect(status().isCreated())),
            "$.numero");

    assertThat(con(avisos(director), "por-revisar/lote/" + numero))
        .singleElement()
        .extracting(a -> a.get("texto"))
        .isEqualTo(
            "Nuevo lote pendiente: Lote %s – Manejo de viveros de café (3 certificados)"
                .formatted(numero));
  }

  @Test
  void unaCorreccionYUnaReemisionTambienAvisan() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String observado = prueba.revisado(director, area);
    mvc.perform(
            post("/api/revision/documentos/%s/observacion".formatted(observado))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"El cargo no coincide con el contrato.\"}"))
        .andExpect(status().isOk());
    RegistroSolicitudDePartePrueba.enviar(
            mvc,
            area,
            "/api/documentos/%s/correccion".formatted(observado),
            """
            {"numeroExpediente": "%s", "nombres": "Lucía", "apellidos": "Paredes Quinto",
             "dni": "45829364",
             "datos": {"cargo": "secretaria", "fechaInicio": "2025-01-02",
                       "fechaFin": "2026-09-30"}}
            """
                .formatted(
                    jdbc.queryForObject(
                        "SELECT numero_expediente FROM documento WHERE codigo = ?",
                        String.class,
                        observado)))
        .andExpect(status().isOk());
    assertThat(con(avisos(director.sesion()), "por-revisar/" + observado))
        .extracting(a -> a.get("texto"))
        .containsExactly(
            "Documento corregido, pendiente de revisión: Certificado de Trabajo – Lucía Paredes"
                + " Quinto",
            "Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto");

    String original = prueba.firmado(director, area);
    String nuevo = prueba.reemitido(area, original);
    assertThat(con(avisos(director.sesion()), "por-revisar/" + nuevo))
        .singleElement()
        .extracting(a -> a.get("texto"))
        .isEqualTo(
            "Reemisión pendiente: Certificado de Trabajo – Lucía Paredes Quintana (reemplaza a %s)"
                .formatted(original));
  }

  @Test
  void cadaDirectorMarcaSusAvisosComoLeidos() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    MockHttpSession otro = sesion("DIRECTOR", null);
    String codigo = enviado(prueba.area("ADMINISTRACION"));
    long id =
        ((Number) con(avisos(director), "por-revisar/" + codigo).getFirst().get("id")).longValue();
    long sinLeer = sinLeer(director);

    // El aviso de otra persona no existe para quien no es su destinatario.
    mvc.perform(post("/api/avisos/%d/lectura".formatted(id)).with(csrf()).session(otro))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("No se encontró el aviso."));
    assertThat(sinLeer(director)).isEqualTo(sinLeer);

    mvc.perform(post("/api/avisos/%d/lectura".formatted(id)).with(csrf()).session(director))
        .andExpect(status().isNoContent());
    assertThat(con(avisos(director), "por-revisar/" + codigo).getFirst().get("leido"))
        .isEqualTo(true);
    assertThat(sinLeer(director)).isEqualTo(sinLeer - 1);
    // El otro director conserva el suyo sin leer.
    assertThat(con(avisos(otro), "por-revisar/" + codigo).getFirst().get("leido")).isEqualTo(false);

    mvc.perform(post("/api/avisos/lectura").with(csrf()).session(otro))
        .andExpect(status().isNoContent());
    assertThat(sinLeer(otro)).isZero();
    assertThat(avisos(otro)).allSatisfy(a -> assertThat(a.get("leido")).isEqualTo(true));
  }

  @Test
  void muestraLosTreintaMasRecientesPrimero() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    MockHttpSession area = prueba.area("ADMINISTRACION");
    enviado(area);
    String ultimo = enviado(area);
    List<Map<String, Object>> avisos = avisos(director);
    assertThat(avisos).hasSizeLessThanOrEqualTo(30);
    assertThat(avisos.getFirst().get("enlace")).isEqualTo("por-revisar/" + ultimo);
  }

  @Test
  void soloQuienTienePermisoDeAvisosLosConsulta() throws Exception {
    mvc.perform(get("/api/avisos")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/avisos").session(sesion("ADMINISTRADOR", null)))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/avisos").session(sesion("CONSULTA_INTERNA", null)))
        .andExpect(status().isOk());
  }
}
