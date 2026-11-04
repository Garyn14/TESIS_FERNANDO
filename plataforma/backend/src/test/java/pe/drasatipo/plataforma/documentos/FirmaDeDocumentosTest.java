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
import java.util.ArrayList;
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

/**
 * HU11 (DRA-22): confirmación y cancelación de la firma. La blockchain es el contrato en memoria
 * (la red Besu real se recorre en la prueba de punta a punta); IPFS es un nodo Kubo real.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class FirmaDeDocumentosTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  @AfterEach
  void sinFallas() {
    contrato.caido = false;
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private Director director() throws Exception {
    return PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
  }

  private String revisado(Director director) throws Exception {
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

  private ResultActions json(MockHttpSession sesion, String ruta, String cuerpo) throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }

  /** Prepara los documentos y devuelve lo que la billetera registraría: {código, hash, HMAC}. */
  private List<String[]> preparados(Director director, String... codigos) throws Exception {
    String respuesta =
        cuerpo(
            json(
                    director.sesion(),
                    "/api/firma/preparacion",
                    "{\"codigos\": [\"%s\"]}".formatted(String.join("\",\"", codigos)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preparados.length()").value(codigos.length)));
    List<Map<String, String>> lista = JsonPath.read(respuesta, "$.preparados");
    List<String[]> registro = new ArrayList<>();
    for (Map<String, String> p : lista) {
      registro.add(new String[] {p.get("codigo"), p.get("hash"), p.get("dniHmac")});
    }
    return registro;
  }

  private ResultActions confirmar(MockHttpSession sesion, String transaccion) throws Exception {
    return json(
        sesion, "/api/firma/confirmacion", "{\"transaccion\": \"%s\"}".formatted(transaccion));
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap(
        "SELECT d.estado, d.transaccion, d.bloque, d.firmado_en, d.billetera_firmante,"
            + " u.nombre_usuario AS firmado_por, d.cid, d.revisado_en"
            + " FROM documento d LEFT JOIN usuario u ON u.id = d.firmado_por WHERE d.codigo = ?",
        codigo);
  }

  private List<String> eventos(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento FROM documento_historial h JOIN documento d ON d.id = h.documento_id"
            + " WHERE d.codigo = ? ORDER BY h.id",
        String.class,
        codigo);
  }

  @Test
  void laBilleteraRegistradaYSuRolSeLeenDelContrato() throws Exception {
    Director director = director();
    mvc.perform(get("/api/firma/billetera").session(director.sesion()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.billetera").value(director.billetera()))
        .andExpect(jsonPath("$.firmante").value(true));
    contrato.firmantes.remove(director.billetera());
    mvc.perform(get("/api/firma/billetera").session(director.sesion()))
        .andExpect(jsonPath("$.firmante").value(false))
        .andExpect(jsonPath("$.aviso").value(PreparacionDeFirma.NO_ES_FIRMANTE));
    contrato.caido = true;
    mvc.perform(get("/api/firma/billetera").session(director.sesion()))
        .andExpect(jsonPath("$.firmante").doesNotExist())
        .andExpect(jsonPath("$.aviso").isNotEmpty());
  }

  @Test
  void laTransaccionLeidaEnLaBlockchainPasaLosDocumentosAFirmadoConLaFechaDelBloque()
      throws Exception {
    Director director = director();
    String a = revisado(director);
    String b = revisado(director);
    String transaccion = contrato.registrar(director.billetera(), preparados(director, a, b));

    confirmar(director.sesion(), transaccion)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmados.length()").value(2))
        .andExpect(jsonPath("$.firmados[0].codigo").value(a))
        .andExpect(jsonPath("$.firmados[0].fechaEmision").value("2026-11-04T15:30Z"))
        .andExpect(jsonPath("$.noAplicados.length()").value(0));

    Map<String, Object> fila = fila(a);
    assertThat(fila.get("estado")).isEqualTo("FIRMADO");
    assertThat(fila.get("transaccion")).isEqualTo(transaccion);
    assertThat(fila.get("billetera_firmante")).isEqualTo(director.billetera());
    assertThat(fila.get("firmado_por")).isNotNull();
    assertThat(fila.get("firmado_en").toString()).startsWith("2026-11-04");
    assertThat(eventos(a)).containsExactly("REGISTRADO", "REVISADO", "PREPARADO", "FIRMADO");

    // Repetir la confirmación no cambia nada ni duplica el historial.
    confirmar(director.sesion(), transaccion)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmados.length()").value(2));
    assertThat(eventos(b)).containsExactly("REGISTRADO", "REVISADO", "PREPARADO", "FIRMADO");

    // Sale de Por revisar y el área lo ve Firmado.
    mvc.perform(get("/api/revision").session(director.sesion()))
        .andExpect(jsonPath("$[?(@.codigo == '%s')]".formatted(a)).isEmpty());
    mvc.perform(
            get("/api/documentos")
                .session(
                    RegistroSolicitudDePartePrueba.sesion(
                        mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION")))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].estado".formatted(a)).value("FIRMADO"));
  }

  @Test
  void noSeMarcaNadaSinUnaTransaccionValidaDeLaBilleteraDelDirector() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    List<String[]> registro = preparados(director, codigo);

    confirmar(director.sesion(), "0x1234")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.transaccion").value(FirmaDeDocumentos.TRANSACCION_INVALIDA));
    confirmar(director.sesion(), "0x%064x".formatted(42))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(FirmaDeDocumentos.TRANSACCION_INVALIDA));
    String deOtra = contrato.registrar("0x00000000000000000000000000000000000000ff", registro);
    confirmar(director.sesion(), deOtra)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(FirmaDeDocumentos.OTRA_BILLETERA));
    contrato.caido = true;
    confirmar(director.sesion(), deOtra).andExpect(status().isServiceUnavailable());
    assertThat(fila(codigo).get("estado")).isEqualTo("PROCESANDO_FIRMA");
  }

  @Test
  void unHashDistintoAlDelPdfPreparadoNoSeMarcaFirmado() throws Exception {
    Director director = director();
    String bueno = revisado(director);
    String malo = revisado(director);
    List<String[]> registro = preparados(director, bueno, malo);
    registro.get(1)[1] = "ab".repeat(32);
    String transaccion = contrato.registrar(director.billetera(), registro);

    confirmar(director.sesion(), transaccion)
        .andExpect(jsonPath("$.firmados.length()").value(1))
        .andExpect(jsonPath("$.firmados[0].codigo").value(bueno))
        .andExpect(jsonPath("$.noAplicados[0].codigo").value(malo))
        .andExpect(jsonPath("$.noAplicados[0].motivo").value(FirmaDeDocumentos.HASH_DISTINTO));
    assertThat(fila(malo).get("estado")).isEqualTo("PROCESANDO_FIRMA");
  }

  @Test
  void siLaFirmaNoSeCompletaVuelvenAPendienteRevisadosYConElMotivo() throws Exception {
    Director director = director();
    String a = revisado(director);
    String b = revisado(director);
    preparados(director, a, b);

    json(
            director.sesion(),
            "/api/firma/cancelacion",
            "{\"codigos\": [\"%s\", \"%s\"], \"motivo\": \"Firma cancelada en la billetera\"}"
                .formatted(a, b))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.devueltos.length()").value(2))
        .andExpect(jsonPath("$.noDevueltos.length()").value(0));
    Map<String, Object> fila = fila(a);
    assertThat(fila.get("estado")).isEqualTo("PENDIENTE");
    assertThat(fila.get("cid")).isNull();
    assertThat(fila.get("revisado_en")).isNotNull();
    assertThat(eventos(a)).endsWith("PREPARADO", "FIRMA_CANCELADA");
    assertThat(
            jdbc.queryForObject(
                "SELECT h.detalle FROM documento_historial h JOIN documento d"
                    + " ON d.id = h.documento_id WHERE d.codigo = ? ORDER BY h.id DESC LIMIT 1",
                String.class,
                a))
        .isEqualTo("Firma cancelada en la billetera. Volvió a Pendiente.");
    // Vuelve a Por revisar como revisado, y se puede firmar de nuevo.
    mvc.perform(get("/api/revision").session(director.sesion()))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].revisado".formatted(a)).value(true));
    preparados(director, a);
  }

  @Test
  void unDocumentoQueQuedoRegistradoNoVuelveAPendiente() throws Exception {
    Director director = director();
    String registrado = revisado(director);
    String noRegistrado = revisado(director);
    contrato.registrar(director.billetera(), preparados(director, registrado));
    preparados(director, noRegistrado);

    json(
            director.sesion(),
            "/api/firma/cancelacion",
            "{\"codigos\": [\"%s\", \"%s\"]}".formatted(registrado, noRegistrado))
        .andExpect(jsonPath("$.devueltos[0]").value(noRegistrado))
        .andExpect(jsonPath("$.noDevueltos[0].codigo").value(registrado))
        .andExpect(jsonPath("$.noDevueltos[0].motivo").value(FirmaDeDocumentos.YA_REGISTRADO));
    assertThat(fila(registrado).get("estado")).isEqualTo("PROCESANDO_FIRMA");

    // Sin la blockchain no se sabe si quedó registrado: no se cambia nada.
    String otro = revisado(director);
    preparados(director, otro);
    contrato.caido = true;
    json(director.sesion(), "/api/firma/cancelacion", "{\"codigos\": [\"%s\"]}".formatted(otro))
        .andExpect(status().isServiceUnavailable());
    assertThat(fila(otro).get("estado")).isEqualTo("PROCESANDO_FIRMA");
  }

  @Test
  void soloElDirectorFirma() throws Exception {
    MockHttpSession area =
        RegistroSolicitudDePartePrueba.sesion(
            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
    mvc.perform(get("/api/firma/billetera").session(area)).andExpect(status().isForbidden());
    confirmar(area, "0x%064x".formatted(1)).andExpect(status().isForbidden());
    json(area, "/api/firma/cancelacion", "{\"codigos\": [\"DRA-2026-AAAAAA\"]}")
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/firma/confirmacion")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isUnauthorized());
  }
}
