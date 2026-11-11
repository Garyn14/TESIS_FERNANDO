package pe.drasatipo.plataforma.documentos;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
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
 * DRA-60: quitar un tipo de documento a un área solo impide registrar documentos nuevos de ese
 * tipo. Lo ya registrado sigue su trámite: el observado se corrige y el firmado se reemite.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class TipoQuitadoDelAreaTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  @AfterEach
  void restaurarConfiguracion() {
    ConfiguracionInicial.restaurar(jdbc);
  }

  private ResultActions json(MockHttpSession sesion, String ruta, String cuerpo) throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }

  /** El Administrador quita el Certificado de Trabajo al Área de Administración. */
  private void quitarCertificadoDeTrabajo() {
    jdbc.update(
        """
        DELETE FROM area_tipo_documento
        WHERE area_id = (SELECT id FROM area WHERE codigo = 'ADMINISTRACION')
          AND tipo_documento_id = (SELECT id FROM tipo_documento WHERE codigo = 'CERTIFICADO_TRABAJO')
        """);
  }

  private String expediente(String codigo) {
    return jdbc.queryForObject(
        "SELECT numero_expediente FROM documento WHERE codigo = ?", String.class, codigo);
  }

  @Test
  void yaNoSeRegistranNuevosPeroElObservadoSeCorrigeYElFirmadoSeReemite() throws Exception {
    DocumentosDePrueba ayuda = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    DocumentosDePrueba.Director director = ayuda.director();
    MockHttpSession pedro = ayuda.area("ADMINISTRACION");
    String firmado = ayuda.firmado(director, pedro);
    String observado = ayuda.revisado(director, pedro);
    json(
            director.sesion(),
            "/api/revision/documentos/%s/observacion".formatted(observado),
            "{\"motivo\": \"El cargo no coincide con el contrato\"}")
        .andExpect(status().isOk());

    quitarCertificadoDeTrabajo();

    // Un documento nuevo de ese tipo ya no se registra.
    RegistroSolicitudDePartePrueba.enviar(
            mvc,
            pedro,
            "/api/documentos",
            RegistroSolicitudDePartePrueba.trabajo(
                RegistroSolicitudDePartePrueba.expedienteNuevo()))
        .andExpect(status().isForbidden());

    // La pantalla de corrección sigue teniendo el formulario del tipo, solo para el área del
    // documento.
    mvc.perform(get("/api/documentos/%s/formulario".formatted(observado)).session(pedro))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.codigo").value("CERTIFICADO_TRABAJO"))
        .andExpect(
            jsonPath("$.campos[*].nombre")
                .value(org.hamcrest.Matchers.contains("cargo", "fechaInicio", "fechaFin")));
    mvc.perform(
            get("/api/documentos/%s/formulario".formatted(observado))
                .session(ayuda.area("CAPACITACION")))
        .andExpect(status().isForbidden());

    // La vista previa de la corrección también usa el tipo del documento.
    json(
            pedro,
            "/api/documentos/%s/correccion/vista-previa".formatted(observado),
            """
            {"numeroExpediente": "%s", "nombres": "Lucía", "apellidos": "Paredes Quinto",
             "dni": "45829364",
             "datos": {"cargo": "secretaria", "fechaInicio": "2025-01-02", "fechaFin": "2026-09-30"}}
            """
                .formatted(expediente(observado)))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.texto").value(org.hamcrest.Matchers.containsString("como secretaria")));

    // El observado se corrige y vuelve a Pendiente.
    json(
            pedro,
            "/api/documentos/%s/correccion".formatted(observado),
            """
            {"numeroExpediente": "%s", "nombres": "Lucía", "apellidos": "Paredes Quinto",
             "dni": "45829364",
             "datos": {"cargo": "secretaria", "fechaInicio": "2025-01-02", "fechaFin": "2026-09-30"}}
            """
                .formatted(expediente(observado)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("PENDIENTE"));

    // El firmado se reemite.
    ayuda.reemitido(pedro, firmado);
  }
}
