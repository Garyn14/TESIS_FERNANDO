package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
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
import pe.drasatipo.plataforma.catalogo.ConfiguracionInicial;

/**
 * DRA-58: Mesa de Partes de área busca, consulta y entrega solo los documentos de su área. Un
 * documento de otra área responde igual que uno inexistente.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class MesaDePartesDeAreaTest {

  private static final String NO_ENCONTRADO = "No se encontró el documento %s.";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private DocumentosDePrueba ayuda;
  private String deAdministracion;
  private String deDesarrollo;

  /** Un Certificado de Trabajo firmado en Administración y otro en Desarrollo Agrario. */
  @BeforeEach
  void preparar() throws Exception {
    ayuda = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    jdbc.update(
        """
        INSERT INTO area_tipo_documento (area_id, tipo_documento_id)
        SELECT a.id, t.id FROM area a, tipo_documento t
        WHERE a.codigo = 'DESARROLLO_AGRARIO' AND t.codigo = 'CERTIFICADO_TRABAJO'
        """);
    DocumentosDePrueba.Director director = ayuda.director();
    deAdministracion = ayuda.firmado(director, ayuda.area("ADMINISTRACION"));
    deDesarrollo = ayuda.firmado(director, ayuda.area("DESARROLLO_AGRARIO"));
  }

  @AfterEach
  void restaurar() {
    ConfiguracionInicial.restaurar(jdbc);
  }

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private List<String> encontrados(MockHttpSession sesion) throws Exception {
    return JsonPath.read(
        cuerpo(
            mvc.perform(get("/api/consulta/documentos?texto=45829364").session(sesion))
                .andExpect(status().isOk())),
        "$.filas[*].codigo");
  }

  private ResultActions entregar(MockHttpSession sesion, String codigo) throws Exception {
    return mvc.perform(
        post("/api/consulta/documentos/%s/entregas".formatted(codigo))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"forma\": \"IMPRESION\"}"));
  }

  @Test
  void buscaSoloLosDocumentosDeSuArea() throws Exception {
    MockHttpSession mesaDeAdministracion = sesion("MESA_PARTES_AREA", "ADMINISTRACION");
    assertThat(encontrados(mesaDeAdministracion))
        .contains(deAdministracion)
        .doesNotContain(deDesarrollo);
    List<String> areas =
        JsonPath.read(
            cuerpo(mvc.perform(get("/api/consulta/documentos").session(mesaDeAdministracion))),
            "$.filas[*].areaNombre");
    assertThat(areas).isNotEmpty().containsOnly("Área de Administración");
    // Mesa de Partes sigue viendo todas las áreas.
    assertThat(encontrados(sesion("CONSULTA_INTERNA", null)))
        .contains(deAdministracion, deDesarrollo);
  }

  @Test
  void abreLaFichaYLaAuditoriaYEntregaLosDeSuArea() throws Exception {
    MockHttpSession mesa = sesion("MESA_PARTES_AREA", "ADMINISTRACION");
    mvc.perform(get("/api/consulta/documentos/" + deAdministracion).session(mesa))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.areaNombre").value("Área de Administración"));
    mvc.perform(
            get("/api/consulta/documentos/%s/auditoria".formatted(deAdministracion)).session(mesa))
        .andExpect(status().isOk());
    mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(deAdministracion)).session(mesa))
        .andExpect(status().isOk());
    entregar(mesa, deAdministracion).andExpect(status().isOk());
    entregar(mesa, deAdministracion).andExpect(status().isOk());
    assertThat(
            jdbc.queryForList(
                "SELECT h.detalle FROM documento_historial h JOIN documento d"
                    + " ON d.id = h.documento_id WHERE d.codigo = ? AND h.evento = 'IMPRESO'"
                    + " ORDER BY h.id",
                String.class,
                deAdministracion))
        .hasSize(2)
        .allMatch(d -> d.contains("(Mesa de Partes de área)"))
        .last()
        .asString()
        .startsWith("Duplicado impreso por");
  }

  @Test
  void unDocumentoDeOtraAreaRespondeIgualQueUnoInexistente() throws Exception {
    MockHttpSession mesa = sesion("MESA_PARTES_AREA", "ADMINISTRACION");
    for (String codigo : new String[] {deDesarrollo, "DRA-2026-NOEXIS"}) {
      String mensaje = NO_ENCONTRADO.formatted(codigo);
      mvc.perform(get("/api/consulta/documentos/" + codigo).session(mesa))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.mensaje").value(mensaje));
      mvc.perform(get("/api/consulta/documentos/%s/auditoria".formatted(codigo)).session(mesa))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.mensaje").value(mensaje));
      mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(codigo)).session(mesa))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.mensaje").value(mensaje));
      entregar(mesa, codigo)
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.mensaje").value(mensaje));
    }
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento_historial h JOIN documento d"
                    + " ON d.id = h.documento_id WHERE d.codigo = ? AND h.evento = 'IMPRESO'",
                Integer.class,
                deDesarrollo))
        .isZero();
  }

  @Test
  void noRegistraNiModificaNiRecibeAvisos() throws Exception {
    MockHttpSession mesa = sesion("MESA_PARTES_AREA", "ADMINISTRACION");
    mvc.perform(get("/api/tipos-documento").session(mesa)).andExpect(status().isForbidden());
    RegistroSolicitudDePartePrueba.enviar(
            mvc,
            mesa,
            "/api/documentos",
            RegistroSolicitudDePartePrueba.trabajo(
                RegistroSolicitudDePartePrueba.expedienteNuevo()))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/documentos/" + deAdministracion).session(mesa))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/revision").session(mesa)).andExpect(status().isForbidden());
    mvc.perform(get("/api/avisos").session(mesa)).andExpect(status().isForbidden());
    mvc.perform(
            post("/api/anulacion/%s/solicitud".formatted(deAdministracion))
                .with(csrf())
                .session(mesa)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"No corresponde a este rol\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            put("/api/catalogo/areas/ADMINISTRACION/tipos-documento/CERTIFICADO_PRACTICAS")
                .with(csrf())
                .session(mesa))
        .andExpect(status().isForbidden());
  }

  @Test
  void elCambioDeAreaRigeDesdeSuSiguientePantalla() throws Exception {
    MockHttpSession mesa = sesion("MESA_PARTES_AREA", "ADMINISTRACION");
    assertThat(encontrados(mesa)).contains(deAdministracion).doesNotContain(deDesarrollo);
    String usuario =
        JsonPath.read(cuerpo(mvc.perform(get("/api/sesion").session(mesa))), "$.nombreUsuario");
    jdbc.update(
        "UPDATE usuario SET area_id = (SELECT id FROM area WHERE codigo = 'DESARROLLO_AGRARIO')"
            + " WHERE nombre_usuario = ?",
        usuario);
    assertThat(encontrados(mesa)).contains(deDesarrollo).doesNotContain(deAdministracion);
  }

  private ResultActions crearCuenta(MockHttpSession admin, String usuario, String area)
      throws Exception {
    return mvc.perform(
        post("/api/usuarios")
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"nombreUsuario": "%s", "nombreCompleto": "Ana Torres Rojas",
                 "rol": "MESA_PARTES_AREA", "area": %s, "contrasenaTemporal": "Temporal2026"}
                """
                    .formatted(usuario, area == null ? "null" : '"' + area + '"')));
  }

  @Test
  void elAdministradorLaCreaConUnAreaObligatoria() throws Exception {
    MockHttpSession admin = sesion("ADMINISTRADOR", null);
    mvc.perform(get("/api/roles").session(admin))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$[?(@.codigo == 'MESA_PARTES_AREA')].nombre")
                .value(org.hamcrest.Matchers.contains("Mesa de Partes de área")))
        .andExpect(
            jsonPath("$[?(@.limitadoAlArea == true)].codigo")
                .value(
                    org.hamcrest.Matchers.containsInAnyOrder(
                        "AREA_ENCARGADA", "MESA_PARTES_AREA")));
    String usuario = "mpa" + System.nanoTime() % 1_000_000;
    crearCuenta(admin, usuario, null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.area").value("Seleccione el área de la persona."));
    crearCuenta(admin, usuario, "ADMINISTRACION")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.rolNombre").value("Mesa de Partes de área"))
        .andExpect(jsonPath("$.area").value("ADMINISTRACION"));
  }
}
