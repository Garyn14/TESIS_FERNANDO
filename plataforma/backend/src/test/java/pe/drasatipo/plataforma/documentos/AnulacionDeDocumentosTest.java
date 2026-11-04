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
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
import pe.drasatipo.plataforma.documentos.PreparacionDeFirmaTest.Director;

/** HU29 (DRA-30): anular un documento firmado con la billetera del Director. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AnulacionDeDocumentosTest {

  static final String MOTIVO = "Emitido por error: el beneficiario no trabajó en ese periodo";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired SincronizacionConBlockchain sincronizacion;

  @AfterEach
  void sinFallas() {
    contrato.caido = false;
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private ResultActions json(MockHttpSession sesion, String ruta, String cuerpo) throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }

  private Director director() throws Exception {
    return PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
  }

  private String pendiente(Director director) throws Exception {
    String codigo =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        RegistroSolicitudDePartePrueba.sesion(
                            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION"),
                        "/api/documentos",
                        trabajo(expedienteNuevo()))
                    .andExpect(status().isCreated())),
            "$.codigo");
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director.sesion()))
        .andExpect(status().isOk());
    return codigo;
  }

  /** Un documento firmado: preparado, registrado en el contrato y confirmado (HU11). */
  private String firmado(Director director) throws Exception {
    String codigo = pendiente(director);
    Map<String, String> p =
        JsonPath.read(
            cuerpo(
                json(
                        director.sesion(),
                        "/api/firma/preparacion",
                        "{\"codigos\": [\"%s\"]}".formatted(codigo))
                    .andExpect(status().isOk())),
            "$.preparados[0]");
    String tx =
        contrato.registrar(
            director.billetera(),
            List.<String[]>of(new String[] {codigo, p.get("hash"), p.get("dniHmac")}));
    json(director.sesion(), "/api/firma/confirmacion", "{\"transaccion\": \"%s\"}".formatted(tx))
        .andExpect(jsonPath("$.firmados.length()").value(1));
    return codigo;
  }

  private ResultActions solicitar(MockHttpSession sesion, String codigo, String motivo)
      throws Exception {
    return json(
        sesion,
        "/api/anulacion/%s/solicitud".formatted(codigo),
        "{\"motivo\": %s}".formatted(motivo == null ? "null" : '"' + motivo + '"'));
  }

  private ResultActions confirmar(MockHttpSession sesion, String codigo, String tx)
      throws Exception {
    return json(
        sesion,
        "/api/anulacion/%s/confirmacion".formatted(codigo),
        "{\"transaccion\": \"%s\"}".formatted(tx));
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap(
        "SELECT d.estado, d.motivo_anulacion, d.anulacion_solicitada_en, d.anulado_en,"
            + " d.transaccion_anulacion, d.bloque_anulacion, u.nombre_usuario AS anulado_por"
            + " FROM documento d LEFT JOIN usuario u ON u.id = d.anulado_por WHERE d.codigo = ?",
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
  void elDirectorAnulaUnFirmadoYQuedaAnuladoConLaFechaDelBloqueYElMotivo() throws Exception {
    Director director = director();
    String codigo = firmado(director);
    mvc.perform(get("/api/firmados").session(director.sesion()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.codigo == '%s')].estado".formatted(codigo)).value("FIRMADO"));

    solicitar(director.sesion(), codigo, MOTIVO)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("FIRMADO"));
    assertThat(fila(codigo))
        .containsEntry("estado", "FIRMADO")
        .containsEntry("motivo_anulacion", MOTIVO);

    String tx = contrato.anular(director.billetera(), codigo);
    confirmar(director.sesion(), codigo, tx)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("ANULADO"))
        .andExpect(jsonPath("$.motivoAnulacion").value(MOTIVO));
    Map<String, Object> fila = fila(codigo);
    assertThat(fila.get("estado")).isEqualTo("ANULADO");
    assertThat(fila.get("transaccion_anulacion")).isEqualTo(tx);
    assertThat(fila.get("anulado_en").toString()).startsWith("2026-11-05");
    assertThat(fila.get("anulado_por")).isNotNull();
    assertThat(ultimoEvento(codigo))
        .startsWith("ANULADO|Anulado por ")
        .contains(director.billetera())
        .contains(tx)
        .endsWith("Motivo: " + MOTIVO);

    // Repetir la confirmación no cambia nada.
    confirmar(director.sesion(), codigo, tx).andExpect(jsonPath("$.estado").value("ANULADO"));
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento_historial h JOIN documento d"
                    + " ON d.id = h.documento_id WHERE d.codigo = ? AND h.evento = 'ANULADO'",
                Integer.class,
                codigo))
        .isEqualTo(1);
    // El área lo ve Anulado con el motivo, y la lista de firmados también.
    mvc.perform(
            get("/api/documentos/" + codigo)
                .session(
                    RegistroSolicitudDePartePrueba.sesion(
                        mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION")))
        .andExpect(jsonPath("$.estado").value("ANULADO"))
        .andExpect(jsonPath("$.motivo").value(MOTIVO));
    mvc.perform(get("/api/firmados").session(director.sesion()))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].estado".formatted(codigo)).value("ANULADO"));
  }

  @Test
  void soloSeAnulaUnFirmadoConMotivoYUnaTransaccionValidaDeSuBilletera() throws Exception {
    Director director = director();
    String codigo = firmado(director);
    solicitar(director.sesion(), codigo, "  ")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").value(RevisionDelDirector.SIN_MOTIVO));
    String noFirmado = pendiente(director);
    solicitar(director.sesion(), noFirmado, MOTIVO)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(AnulacionDeDocumentos.NO_FIRMADO));

    solicitar(director.sesion(), codigo, MOTIVO).andExpect(status().isOk());
    confirmar(director.sesion(), codigo, "0x12").andExpect(status().isBadRequest());
    confirmar(director.sesion(), codigo, "0x%064x".formatted(7))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(AnulacionDeDocumentos.SIN_ANULACION));
    String deOtra = contrato.anular("0x00000000000000000000000000000000000000ff", codigo);
    confirmar(director.sesion(), codigo, deOtra)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(FirmaDeDocumentos.OTRA_BILLETERA));
    contrato.caido = true;
    confirmar(director.sesion(), codigo, deOtra).andExpect(status().isServiceUnavailable());
    assertThat(fila(codigo).get("estado")).isEqualTo("FIRMADO");
  }

  @Test
  void siLaAnulacionNoSeCompletaElDocumentoSigueFirmadoYSeDescartaElMotivo() throws Exception {
    Director director = director();
    String codigo = firmado(director);
    solicitar(director.sesion(), codigo, MOTIVO).andExpect(status().isOk());
    json(director.sesion(), "/api/anulacion/%s/cancelacion".formatted(codigo), "{}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("FIRMADO"));
    assertThat(fila(codigo)).containsEntry("motivo_anulacion", null);

    // Si en realidad quedó anulado en la blockchain, no se descarta: lo confirma la sincronización.
    solicitar(director.sesion(), codigo, MOTIVO).andExpect(status().isOk());
    contrato.anular(director.billetera(), codigo);
    json(director.sesion(), "/api/anulacion/%s/cancelacion".formatted(codigo), "{}")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(AnulacionDeDocumentos.YA_ANULADO));
    assertThat(fila(codigo)).containsEntry("motivo_anulacion", MOTIVO);
  }

  @Test
  void laSincronizacionAnulaConElMotivoGuardadoYDescartaLasSolicitudesVencidas() throws Exception {
    Director director = director();
    // El navegador se cerró después de anular con la billetera.
    String conMotivo = firmado(director);
    solicitar(director.sesion(), conMotivo, MOTIVO).andExpect(status().isOk());
    contrato.anular(director.billetera(), conMotivo);
    // Anulado desde otra herramienta, sin pasar por la plataforma.
    String sinMotivo = firmado(director);
    contrato.anular(director.billetera(), sinMotivo);
    // Solicitado, pero la billetera nunca lo envió.
    String vencido = firmado(director);
    solicitar(director.sesion(), vencido, MOTIVO).andExpect(status().isOk());

    var resumen = sincronizacion.sincronizar(Instant.now().plus(Duration.ofMinutes(16)));
    assertThat(resumen.anulados()).isGreaterThanOrEqualTo(2);
    assertThat(fila(conMotivo))
        .containsEntry("estado", "ANULADO")
        .containsEntry("motivo_anulacion", MOTIVO);
    assertThat(ultimoEvento(conMotivo))
        .startsWith("ANULADO|Anulación confirmada por la sincronización: anulado por");
    assertThat(fila(sinMotivo))
        .containsEntry("estado", "ANULADO")
        .containsEntry("motivo_anulacion", AnulacionDeDocumentos.SIN_MOTIVO_REGISTRADO);
    assertThat(fila(vencido))
        .containsEntry("estado", "FIRMADO")
        .containsEntry("motivo_anulacion", null)
        .containsEntry("anulacion_solicitada_en", null);
  }

  @Test
  void soloElDirectorVeLosFirmadosYAnula() throws Exception {
    Director director = director();
    String codigo = firmado(director);
    MockHttpSession area =
        RegistroSolicitudDePartePrueba.sesion(
            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
    mvc.perform(get("/api/firmados").session(area)).andExpect(status().isForbidden());
    solicitar(area, codigo, MOTIVO).andExpect(status().isForbidden());
    confirmar(area, codigo, "0x%064x".formatted(1)).andExpect(status().isForbidden());
    mvc.perform(
            post("/api/anulacion/%s/solicitud".formatted(codigo))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\": \"x\"}"))
        .andExpect(status().isUnauthorized());
    assertThat(fila(codigo).get("estado")).isEqualTo("FIRMADO");
  }
}
