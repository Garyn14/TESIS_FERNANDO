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

/** HU15 (DRA-29): el Área encargada corrige un documento observado y lo reenvía a revisión. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class CorregirDocumentoTest {

  private static int dni = 80_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private MockHttpSession area(String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "AREA_ENCARGADA", area);
  }

  private MockHttpSession director() throws Exception {
    return PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato).sesion();
  }

  private ResultActions json(MockHttpSession sesion, String ruta, String cuerpo) throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }

  /** Un Certificado de Trabajo observado por el Director; devuelve su código y su expediente. */
  private String[] observado(MockHttpSession director) throws Exception {
    String expediente = expedienteNuevo();
    String codigo =
        JsonPath.read(
            cuerpo(
                enviar(mvc, area("ADMINISTRACION"), "/api/documentos", trabajo(expediente))
                    .andExpect(status().isCreated())),
            "$.codigo");
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director))
        .andExpect(status().isOk());
    json(
            director,
            "/api/revision/documentos/%s/observacion".formatted(codigo),
            "{\"motivo\": \"El cargo no coincide con el contrato\"}")
        .andExpect(status().isOk());
    return new String[] {codigo, expediente};
  }

  private static String correccion(String expediente, String apellidos, String dni, String cargo) {
    return """
        {"numeroExpediente": "%s", "nombres": "Lucía", "apellidos": "%s", "dni": "%s",
         "datos": {"cargo": "%s", "fechaInicio": "2025-01-02", "fechaFin": "2026-09-30"}}
        """
        .formatted(expediente, apellidos, dni, cargo);
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap(
        "SELECT estado, motivo, revisado_en, corregido_en, apellidos, dni_hmac, texto, datos::text"
            + " AS datos FROM documento WHERE codigo = ?",
        codigo);
  }

  private String ultimoEvento(String codigo) {
    return jdbc.queryForObject(
        "SELECT h.evento || '|' || h.detalle FROM documento_historial h"
            + " JOIN documento d ON d.id = h.documento_id WHERE d.codigo = ?"
            + " ORDER BY h.id DESC LIMIT 1",
        String.class,
        codigo);
  }

  @Test
  void elDocumentoCorregidoVuelveAPendienteSinLaRevisionYConSusCambiosEnElHistorial()
      throws Exception {
    MockHttpSession director = director();
    String[] doc = observado(director);
    String antesHmac = (String) fila(doc[0]).get("dni_hmac");
    MockHttpSession area = area("ADMINISTRACION");
    // El detalle trae el motivo y los datos para precargar el formulario.
    mvc.perform(get("/api/documentos/" + doc[0]).session(area))
        .andExpect(jsonPath("$.motivo").value("El cargo no coincide con el contrato"))
        .andExpect(jsonPath("$.datos.cargo").value("asistente administrativa"));

    json(
            area,
            "/api/documentos/%s/correccion".formatted(doc[0]),
            correccion(doc[1], "Paredes Quintana", "45829365", "secretaria"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.codigo").value(doc[0]))
        .andExpect(jsonPath("$.estado").value("PENDIENTE"))
        .andExpect(jsonPath("$.motivo").doesNotExist())
        .andExpect(jsonPath("$.corregido").value(true))
        .andExpect(jsonPath("$.apellidos").value("Paredes Quintana"));

    Map<String, Object> fila = fila(doc[0]);
    assertThat(fila.get("estado")).isEqualTo("PENDIENTE");
    assertThat(fila.get("motivo")).isNull();
    assertThat(fila.get("revisado_en")).isNull();
    assertThat(fila.get("corregido_en")).isNotNull();
    assertThat(fila.get("dni_hmac")).isNotEqualTo(antesHmac);
    assertThat((String) fila.get("texto")).contains("como secretaria");
    assertThat(ultimoEvento(doc[0]))
        .startsWith("CORREGIDO|Corregido y reenviado a revisión por ")
        .contains("Apellidos: Paredes Quinto → Paredes Quintana")
        .contains("DNI: 45829364 → 45829365")
        .contains("Cargo: asistente administrativa → secretaria")
        .doesNotContain("N.° de expediente");

    // Vuelve a Por revisar, corregido y sin revisar: el Director debe revisarlo de nuevo.
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].corregido".formatted(doc[0])).value(true))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].revisado".formatted(doc[0])).value(false));
  }

  @Test
  void seAplicanLasValidacionesDelRegistro() throws Exception {
    MockHttpSession director = director();
    String[] doc = observado(director);
    String[] otro = observado(director);
    MockHttpSession area = area("ADMINISTRACION");
    String ruta = "/api/documentos/%s/correccion".formatted(doc[0]);
    json(area, ruta, correccion("2026-1", "Paredes", "123", ""))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.numeroExpediente").exists())
        .andExpect(jsonPath("$.campos.dni").value("El DNI debe tener 8 dígitos."))
        .andExpect(jsonPath("$.campos['datos.cargo']").exists());
    // El expediente de otro documento no se puede usar.
    json(area, ruta, correccion(otro[1], "Paredes Quinto", "45829364", "secretaria"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(RegistroDeDocumentos.EXPEDIENTE_REPETIDO));
    assertThat(fila(doc[0]).get("estado")).isEqualTo("OBSERVADO");
    // Reenviar sin cambios también se puede: queda anotado.
    json(area, ruta, correccion(doc[1], "Paredes Quinto", "45829364", "asistente administrativa"))
        .andExpect(status().isOk());
    assertThat(ultimoEvento(doc[0])).endsWith("Sin cambios en los datos.");
  }

  @Test
  void enUnLoteSeCorrigeElBeneficiarioSinRepetirUnDniDelLote() throws Exception {
    MockHttpSession director = director();
    int primero = ++dni;
    String filas =
        "{\"nombres\": \"Juan\", \"apellidos\": \"Ccori\", \"dni\": \"%d\"},".formatted(primero)
            + "{\"nombres\": \"Gladys\", \"apellidos\": \"Sanchez\", \"dni\": \"%d\"}"
                .formatted(++dni);
    String numero =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        area("CAPACITACION"),
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
    String gladys = codigos.get(1);
    json(
            director,
            "/api/revision/lotes/%s/observacion".formatted(numero),
            "{\"codigos\": [\"%s\"], \"motivo\": \"El DNI no coincide\"}".formatted(gladys))
        .andExpect(status().isOk());

    MockHttpSession area = area("CAPACITACION");
    String ruta = "/api/documentos/%s/correccion".formatted(gladys);
    json(
            area,
            ruta,
            "{\"nombres\": \"Gladys\", \"apellidos\": \"Sanchez\", \"dni\": \"%d\"}"
                .formatted(primero))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.dni").value(RegistroDeDocumentos.DNI_EN_EL_LOTE));
    String textoAntes = (String) fila(gladys).get("texto");
    json(
            area,
            ruta,
            "{\"nombres\": \"Gladys\", \"apellidos\": \"Sánchez Ñaupari\", \"dni\": \"45903318\"}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("PENDIENTE"))
        .andExpect(jsonPath("$.lote").value(numero));
    assertThat(fila(gladys).get("texto")).isEqualTo(textoAntes);
    assertThat(ultimoEvento(gladys))
        .contains("Apellidos: Sanchez → Sánchez Ñaupari")
        .doesNotContain("Cargo");
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.lote == '%s')].corregido".formatted(numero)).value(true))
        .andExpect(jsonPath("$[?(@.lote == '%s')].cantidad".formatted(numero)).value(2));
  }

  @Test
  void soloSeCorrigeUnObservadoDelAreaPropiaYSoloElArea() throws Exception {
    MockHttpSession director = director();
    String[] doc = observado(director);
    String cuerpo = correccion(doc[1], "Paredes Quinto", "45829364", "secretaria");
    String ruta = "/api/documentos/%s/correccion".formatted(doc[0]);
    json(area("CAPACITACION"), ruta, cuerpo)
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value(RegistroDeDocumentos.DE_OTRA_AREA));
    json(director, ruta, cuerpo).andExpect(status().isForbidden());
    mvc.perform(post(ruta).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo))
        .andExpect(status().isUnauthorized());

    MockHttpSession area = area("ADMINISTRACION");
    json(area, ruta, cuerpo).andExpect(status().isOk());
    // Ya está Pendiente: no se corrige otra vez.
    json(area, ruta, cuerpo)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(RegistroDeDocumentos.NO_OBSERVADO));

    // Un rechazado no se corrige: el rechazo es definitivo.
    String expediente = expedienteNuevo();
    String rechazado =
        JsonPath.read(
            cuerpo(
                enviar(mvc, area, "/api/documentos", trabajo(expediente))
                    .andExpect(status().isCreated())),
            "$.codigo");
    json(
            director,
            "/api/revision/documentos/%s/rechazo".formatted(rechazado),
            "{\"motivo\": \"No corresponde\"}")
        .andExpect(status().isOk());
    json(
            area,
            "/api/documentos/%s/correccion".formatted(rechazado),
            correccion(expediente, "Paredes Quinto", "45829364", "secretaria"))
        .andExpect(status().isConflict());
    assertThat(fila(rechazado).get("estado")).isEqualTo("RECHAZADO");
  }
}
