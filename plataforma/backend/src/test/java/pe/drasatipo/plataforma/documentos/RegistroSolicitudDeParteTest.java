package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.expedienteNuevo;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.trabajo;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
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

/** HU08 (DRA-19): registro de documentos a solicitud de parte, con sesiones reales. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class RegistroSolicitudDeParteTest {

  static final String CLAVE_HMAC = "clave-de-prueba-del-hmac-del-dni-2026";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  private MockHttpSession administracion() throws Exception {
    return sesion("AREA_ENCARGADA", "ADMINISTRACION");
  }

  private String codigoRegistrado(MockHttpSession sesion, String cuerpo) throws Exception {
    String json =
        enviar(mvc, sesion, "/api/documentos", cuerpo)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    return JsonPath.read(json, "$.codigo");
  }

  @Test
  void elTipoIncluyeLosCamposDeSuFormulario() throws Exception {
    mvc.perform(get("/api/tipos-documento/CERTIFICADO_PRACTICAS").session(administracion()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.campos[*].nombre")
                .value(
                    org.hamcrest.Matchers.contains(
                        "modalidad", "areaPracticas", "fechaInicio", "fechaFin")))
        .andExpect(jsonPath("$.campos[0].tipo").value("OPCION"))
        .andExpect(jsonPath("$.campos[0].opciones[1]").value("profesionales"));
  }

  @Test
  void laVistaPreviaArmaElTextoConLaPlantillaSinGuardarNada() throws Exception {
    Integer antes = jdbc.queryForObject("SELECT count(*) FROM documento", Integer.class);
    enviar(mvc, administracion(), "/api/documentos/vista-previa", trabajo(expedienteNuevo()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.titulo").value("CERTIFICADO"))
        .andExpect(jsonPath("$.nombres").value("Lucía"))
        .andExpect(jsonPath("$.apellidos").value("Paredes Quinto"))
        .andExpect(
            jsonPath("$.texto")
                .value(
                    "Por haber laborado en la Agencia Agraria Satipo como asistente"
                        + " administrativa, del 02/01/2025 al 30/09/2026, demostrando"
                        + " responsabilidad y buen desempeño."));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM documento", Integer.class))
        .isEqualTo(antes);
  }

  @Test
  void exigeElExpedienteYValidaCadaCampo() throws Exception {
    String manana = LocalDate.now().plusDays(2).toString();
    enviar(
            mvc,
            administracion(),
            "/api/documentos/vista-previa",
            """
            {"tipo": "CERTIFICADO_TRABAJO", "numeroExpediente": "", "nombres": "Lucía3",
             "apellidos": "", "dni": "4582936",
             "datos": {"cargo": "a", "fechaInicio": "2026-13-01", "fechaFin": "%s"}}
            """
                .formatted(manana))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.numeroExpediente").value("Ingrese el número de expediente."))
        .andExpect(
            jsonPath("$.campos.nombres")
                .value("Use solo letras, espacios, apóstrofo o guion (de 2 a 100 caracteres)."))
        .andExpect(jsonPath("$.campos.apellidos").value("Ingrese los apellidos."))
        .andExpect(jsonPath("$.campos.dni").value("El DNI debe tener 8 dígitos."))
        .andExpect(jsonPath("$.campos['datos.cargo']").value("Use de 2 a 100 caracteres."))
        .andExpect(jsonPath("$.campos['datos.fechaInicio']").value("Ingrese una fecha válida."))
        .andExpect(
            jsonPath("$.campos['datos.fechaFin']").value("La fecha no puede ser posterior a hoy."));
  }

  @Test
  void elExpedienteSigueElFormatoYLaFechaDeFinNoEsAnterior() throws Exception {
    enviar(
            mvc,
            administracion(),
            "/api/documentos",
            """
            {"tipo": "CERTIFICADO_TRABAJO", "numeroExpediente": "2026-4817", "nombres": "Lucía",
             "apellidos": "Paredes", "dni": "45829364",
             "datos": {"cargo": "asistente", "fechaInicio": "2026-05-02",
                       "fechaFin": "2026-05-01"}}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.numeroExpediente")
                .value("Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817."))
        .andExpect(
            jsonPath("$.campos['datos.fechaFin']")
                .value("La fecha de fin no puede ser anterior a la de inicio."));
  }

  @Test
  void alEnviarQuedaPendienteConCodigoTokenYHmacDelDni() throws Exception {
    String expediente = expedienteNuevo();
    String json =
        enviar(mvc, administracion(), "/api/documentos", trabajo(expediente.toLowerCase()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.estado").value("PENDIENTE"))
            .andExpect(jsonPath("$.numeroExpediente").value(expediente))
            .andExpect(jsonPath("$.origen").value("SOLICITUD_PARTE"))
            .andExpect(jsonPath("$.areaNombre").value("Área de Administración"))
            .andExpect(jsonPath("$.dniHmac").doesNotExist())
            .andExpect(jsonPath("$.tokenQr").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    String codigo = JsonPath.read(json, "$.codigo");
    assertThat(codigo)
        .matches("DRA-" + LocalDate.now().getYear() + "-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}");

    Map<String, Object> fila =
        jdbc.queryForMap(
            "SELECT token_qr, dni_hmac, estado, datos::text AS datos FROM documento WHERE codigo = ?",
            codigo);
    assertThat((String) fila.get("token_qr")).matches("[A-Za-z0-9_-]{43}");
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(CLAVE_HMAC.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    assertThat(fila.get("dni_hmac"))
        .isEqualTo(HexFormat.of().formatHex(mac.doFinal("45829364".getBytes())));
    assertThat((String) fila.get("datos")).contains("\"cargo\": \"asistente administrativa\"");
    assertThat(
            jdbc.queryForObject(
                "SELECT h.evento FROM documento_historial h JOIN documento d ON d.id ="
                    + " h.documento_id WHERE d.codigo = ?",
                String.class,
                codigo))
        .isEqualTo("REGISTRADO");
  }

  @Test
  void elExpedienteNoSeRepiteEntreDocumentos() throws Exception {
    String expediente = expedienteNuevo();
    MockHttpSession sesion = administracion();
    codigoRegistrado(sesion, trabajo(expediente));
    enviar(mvc, sesion, "/api/documentos", trabajo(expediente))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.numeroExpediente")
                .value("El número de expediente ya está registrado en otro documento."));
  }

  @Test
  void soloRegistraTiposDeSuAreaYASolicitudDeParte() throws Exception {
    enviar(
            mvc,
            sesion("AREA_ENCARGADA", "CAPACITACION"),
            "/api/documentos",
            trabajo(expedienteNuevo()))
        .andExpect(status().isForbidden())
        .andExpect(
            jsonPath("$.mensaje").value("Este tipo de documento no está asignado a su área."));
    enviar(
            mvc,
            sesion("AREA_ENCARGADA", "CAPACITACION"),
            "/api/documentos",
            trabajo(expedienteNuevo()).replace("CERTIFICADO_TRABAJO", "CERTIFICADO_CAPACITACION"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.mensaje").value("Este tipo de documento se registra por lista."));
  }

  @Test
  void misDocumentosListaSoloLosDelAreaDelMasRecienteAlMasAntiguo() throws Exception {
    MockHttpSession administracion = administracion();
    String primero = codigoRegistrado(administracion, trabajo(expedienteNuevo()));
    String segundo = codigoRegistrado(administracion(), trabajo(expedienteNuevo()));

    mvc.perform(get("/api/documentos").session(administracion))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].codigo").value(segundo))
        .andExpect(
            jsonPath("$[?(@.codigo == '%s')].beneficiario".formatted(primero))
                .value("Lucía Paredes Quinto"))
        .andExpect(jsonPath("$[0].estado").value("PENDIENTE"));

    mvc.perform(get("/api/documentos").session(sesion("AREA_ENCARGADA", "CAPACITACION")))
        .andExpect(jsonPath("$[?(@.codigo == '%s')]".formatted(primero)).isEmpty());
    mvc.perform(get("/api/documentos").session(sesion("AREA_ENCARGADA", null)))
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void elDetalleDeOtraAreaNoSeMuestra() throws Exception {
    String codigo = codigoRegistrado(administracion(), trabajo(expedienteNuevo()));
    mvc.perform(get("/api/documentos/" + codigo).session(administracion()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.texto").exists())
        .andExpect(jsonPath("$.dni").value("45829364"));
    mvc.perform(get("/api/documentos/" + codigo).session(sesion("AREA_ENCARGADA", "CAPACITACION")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value("Este documento no pertenece a su área."));
    mvc.perform(get("/api/documentos/DRA-2026-ZZZZZZ").session(administracion()))
        .andExpect(status().isForbidden());
  }

  @Test
  void noHayRutasParaModificarUnDocumentoEnviado() throws Exception {
    MockHttpSession sesion = administracion();
    String codigo = codigoRegistrado(sesion, trabajo(expedienteNuevo()));
    mvc.perform(put("/api/documentos/" + codigo).with(csrf()).session(sesion))
        .andExpect(status().isMethodNotAllowed());
    mvc.perform(delete("/api/documentos/" + codigo).with(csrf()).session(sesion))
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  void permisosDeLasRutas() throws Exception {
    mvc.perform(get("/api/documentos")).andExpect(status().isUnauthorized());
    for (String rol : new String[] {"ADMINISTRADOR", "DIRECTOR", "CONSULTA_INTERNA"}) {
      MockHttpSession otro = sesion(rol, null);
      mvc.perform(get("/api/documentos").session(otro)).andExpect(status().isForbidden());
      enviar(mvc, otro, "/api/documentos", trabajo(expedienteNuevo()))
          .andExpect(status().isForbidden());
      enviar(mvc, otro, "/api/documentos/vista-previa", trabajo(expedienteNuevo()))
          .andExpect(status().isForbidden());
    }
  }
}
