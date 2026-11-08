package pe.drasatipo.plataforma.documentos;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
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

/** HU23 (DRA-36): ficha de un documento para Mesa de Partes, con su estado y sus datos (RF43). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class FichaDelDocumentoTest {

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

  private ResultActions ficha(String codigo) throws Exception {
    return mvc.perform(get("/api/consulta/documentos/" + codigo).session(mesaDePartes));
  }

  private String enviado(MockHttpSession area) throws Exception {
    return JsonPath.read(
        RegistroSolicitudDePartePrueba.enviar(
                mvc,
                area,
                "/api/documentos",
                RegistroSolicitudDePartePrueba.trabajo(
                    RegistroSolicitudDePartePrueba.expedienteNuevo()))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8),
        "$.codigo");
  }

  private void decidir(DocumentosDePrueba.Director director, String codigo, String accion)
      throws Exception {
    prueba.revisar(director, codigo);
    mvc.perform(
            post("/api/revision/documentos/%s/%s".formatted(codigo, accion))
                .with(csrf())
                .session(director.sesion())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"El cargo no coincide con el contrato.\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void unPendienteMuestraSusDatosBasicosSinDatosTecnicos() throws Exception {
    String codigo = enviado(prueba.area("ADMINISTRACION"));

    String cuerpo =
        ficha(codigo)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.codigo").value(codigo))
            .andExpect(jsonPath("$.estado").value("PENDIENTE"))
            .andExpect(jsonPath("$.tipoNombre").value("Certificado de Trabajo"))
            .andExpect(jsonPath("$.origen").value("SOLICITUD_PARTE"))
            .andExpect(jsonPath("$.beneficiario").value("Lucía Paredes Quinto"))
            .andExpect(jsonPath("$.dni").value("45829364"))
            .andExpect(jsonPath("$.numeroExpediente").exists())
            .andExpect(jsonPath("$.areaNombre").value("Área de Administración"))
            .andExpect(jsonPath("$.registradoEn").exists())
            .andExpect(jsonPath("$.lote").doesNotExist())
            .andExpect(jsonPath("$.motivo").doesNotExist())
            .andExpect(jsonPath("$.firmadoEn").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    // Nunca el HMAC del DNI, el token del QR ni el texto del documento.
    for (String columna : List.of("dni_hmac", "token_qr")) {
      String valor =
          jdbc.queryForObject(
              "SELECT " + columna + " FROM documento WHERE codigo = ?", String.class, codigo);
      org.assertj.core.api.Assertions.assertThat(cuerpo).doesNotContain(valor);
    }
  }

  @Test
  void observadoYRechazadoMuestranElMotivo() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String observado = enviado(area);
    String rechazado = enviado(area);
    decidir(director, observado, "observacion");
    decidir(director, rechazado, "rechazo");

    ficha(observado)
        .andExpect(jsonPath("$.estado").value("OBSERVADO"))
        .andExpect(jsonPath("$.motivo").value("El cargo no coincide con el contrato."));
    ficha(rechazado)
        .andExpect(jsonPath("$.estado").value("RECHAZADO"))
        .andExpect(jsonPath("$.motivo").value("El cargo no coincide con el contrato."));
  }

  @Test
  void firmadoMuestraLaFechaDeFirmaYLaReemisionEnCurso() throws Exception {
    var director = prueba.director();
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String original = prueba.firmado(director, area);

    ficha(original)
        .andExpect(jsonPath("$.estado").value("FIRMADO"))
        .andExpect(jsonPath("$.firmadoEn").exists())
        .andExpect(jsonPath("$.reemisionEnCurso").doesNotExist());

    String nuevo = prueba.reemitido(area, original);
    ficha(original).andExpect(jsonPath("$.reemisionEnCurso").value(nuevo));
    ficha(nuevo)
        .andExpect(jsonPath("$.estado").value("PENDIENTE"))
        .andExpect(jsonPath("$.reemplazaA").value(original));

    // Al firmarse la reemisión, el original queda Anulado y reemplazado por ella.
    prueba.revisar(director, nuevo);
    prueba.confirmar(director, prueba.firmar(director, nuevo), 1);
    ficha(original)
        .andExpect(jsonPath("$.estado").value("ANULADO"))
        .andExpect(jsonPath("$.anuladoEn").exists())
        .andExpect(
            jsonPath("$.motivo")
                .value(org.hamcrest.Matchers.startsWith("Reemplazado por " + nuevo)))
        .andExpect(jsonPath("$.reemplazadoPor").value(nuevo))
        .andExpect(jsonPath("$.reemisionEnCurso").doesNotExist());
  }

  @Test
  void unCertificadoDeLoteMuestraElLoteYElEvento() throws Exception {
    String numero =
        JsonPath.read(
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
                     "beneficiarios": [{"nombres": "Ana", "apellidos": "Soto", "dni": "72100001"}]}
                    """)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8),
            "$.numero");
    String codigo =
        jdbc.queryForObject(
            "SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = ?",
            String.class,
            numero);

    ficha(codigo)
        .andExpect(jsonPath("$.origen").value("OFICIO"))
        .andExpect(jsonPath("$.lote").value(numero))
        .andExpect(jsonPath("$.evento").value("Manejo de viveros de café"))
        .andExpect(jsonPath("$.numeroExpediente").doesNotExist())
        .andExpect(jsonPath("$.areaNombre").value("Área de Capacitación"));
  }

  @Test
  void unCodigoQueNoExisteResponde404() throws Exception {
    ficha("DRA-2026-NOEXST")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value("No se encontró el documento DRA-2026-NOEXST."));
  }

  @Test
  void soloConsultaInternaVeLaFicha() throws Exception {
    MockHttpSession area = prueba.area("ADMINISTRACION");
    String codigo = enviado(area);
    mvc.perform(get("/api/consulta/documentos/" + codigo)).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/consulta/documentos/" + codigo).session(area))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/consulta/documentos/" + codigo).session(prueba.director().sesion()))
        .andExpect(status().isForbidden());
  }
}
