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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
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

/** HU30 (DRA-31): reemitir un documento firmado con los datos corregidos. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class ReemisionDeDocumentosTest {

  static final String MOTIVO = "El apellido del beneficiario estaba mal escrito";
  private static final AtomicInteger dnis = new AtomicInteger(47300000);

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired SincronizacionConBlockchain sincronizacion;

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

  private MockHttpSession area(String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "AREA_ENCARGADA", area);
  }

  /** Prepara y registra los documentos con la billetera del Director, como lo hace la pantalla. */
  private String firmar(Director director, String... codigos) throws Exception {
    List<Map<String, String>> preparados =
        JsonPath.read(
            cuerpo(
                json(
                        director.sesion(),
                        "/api/firma/preparacion",
                        "{\"codigos\": [\"%s\"]}".formatted(String.join("\", \"", codigos)))
                    .andExpect(status().isOk())),
            "$.preparados");
    List<String[]> nuevos = new ArrayList<>();
    List<String[]> reemisiones = new ArrayList<>();
    for (Map<String, String> p : preparados) {
      if (p.get("reemplaza") == null) {
        nuevos.add(new String[] {p.get("codigo"), p.get("hash"), p.get("dniHmac")});
      } else {
        reemisiones.add(
            new String[] {p.get("codigo"), p.get("hash"), p.get("dniHmac"), p.get("reemplaza")});
      }
    }
    String tx =
        reemisiones.isEmpty()
            ? contrato.registrar(director.billetera(), nuevos)
            : contrato.reemitir(director.billetera(), reemisiones);
    return tx;
  }

  private void confirmar(Director director, String tx, int firmados) throws Exception {
    json(director.sesion(), "/api/firma/confirmacion", "{\"transaccion\": \"%s\"}".formatted(tx))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmados.length()").value(firmados));
  }

  private String revisado(Director director, MockHttpSession area) throws Exception {
    String codigo =
        JsonPath.read(
            cuerpo(
                enviar(mvc, area, "/api/documentos", trabajo(expedienteNuevo()))
                    .andExpect(status().isCreated())),
            "$.codigo");
    revisar(director, codigo);
    return codigo;
  }

  private void revisar(Director director, String codigo) throws Exception {
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director.sesion()))
        .andExpect(status().isOk());
  }

  private String firmado(Director director, MockHttpSession area) throws Exception {
    String codigo = revisado(director, area);
    confirmar(director, firmar(director, codigo), 1);
    return codigo;
  }

  private static String corregido(String apellidos, String cargo, String motivo) {
    return """
    {"nombres": "Lucía", "apellidos": "%s", "dni": "45829364",
     "datos": {"cargo": "%s", "fechaInicio": "2025-01-02", "fechaFin": "2026-09-30"},
     "motivo": %s}
    """
        .formatted(apellidos, cargo, motivo == null ? "null" : '"' + motivo + '"');
  }

  private ResultActions reemitir(MockHttpSession sesion, String codigo, String cuerpo)
      throws Exception {
    return json(sesion, "/api/documentos/%s/reemision".formatted(codigo), cuerpo);
  }

  private String reemitido(MockHttpSession area, String codigo) throws Exception {
    return JsonPath.read(
        cuerpo(
            reemitir(area, codigo, corregido("Paredes Quintana", "secretaria", MOTIVO))
                .andExpect(status().isCreated())),
        "$.codigo");
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap(
        "SELECT d.estado, d.numero_expediente, d.motivo_anulacion, d.transaccion_anulacion,"
            + " d.transaccion, o.codigo AS reemplaza FROM documento d"
            + " LEFT JOIN documento o ON o.id = d.reemplaza_a WHERE d.codigo = ?",
        codigo);
  }

  private List<String> eventos(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento || '|' || h.detalle FROM documento_historial h"
            + " JOIN documento d ON d.id = h.documento_id WHERE d.codigo = ? ORDER BY h.id",
        String.class,
        codigo);
  }

  @Test
  void laReemisionSigueLaRevisionYAlFirmarseAnulaAlOriginalEnLaMismaTransaccion() throws Exception {
    Director director = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    MockHttpSession area = area("ADMINISTRACION");
    String original = firmado(director, area);

    // La vista previa arma el texto con los datos corregidos, sin guardar nada.
    json(
            area,
            "/api/documentos/%s/reemision/vista-previa".formatted(original),
            corregido("Paredes Quintana", "secretaria", null))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.texto").value(org.hamcrest.Matchers.containsString("secretaria")));

    String nuevo = reemitido(area, original);
    assertThat(nuevo).isNotEqualTo(original);
    Map<String, Object> reemision = fila(nuevo);
    assertThat(reemision.get("estado")).isEqualTo("PENDIENTE");
    assertThat(reemision.get("reemplaza")).isEqualTo(original);
    assertThat(reemision.get("numero_expediente"))
        .isEqualTo(fila(original).get("numero_expediente"));
    assertThat(eventos(nuevo).getFirst())
        .startsWith(
            "REGISTRADO|Reemisión de %s registrada y enviada a revisión por".formatted(original))
        .contains("Motivo: " + MOTIVO)
        .contains("Apellidos: Paredes Quinto → Paredes Quintana")
        .contains("Cargo: asistente administrativa → secretaria");
    assertThat(eventos(original).getLast())
        .startsWith("REEMISION_SOLICITADA|Reemisión solicitada por")
        .contains(nuevo)
        .endsWith("Motivo: " + MOTIVO);

    // El área ve los dos vínculos; el original sigue Firmado.
    mvc.perform(get("/api/documentos/" + original).session(area))
        .andExpect(jsonPath("$.estado").value("FIRMADO"))
        .andExpect(jsonPath("$.reemisionEnCurso").value(nuevo))
        .andExpect(jsonPath("$.reemplazadoPor").doesNotExist());
    mvc.perform(get("/api/documentos/" + nuevo).session(area))
        .andExpect(jsonPath("$.reemision.original").value(original))
        .andExpect(jsonPath("$.reemision.motivo").value(MOTIVO));

    // No hay dos reemisiones en curso, y el Director no anula el original por separado.
    reemitir(area, original, corregido("Paredes Q.", "secretaria", MOTIVO))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje").value(RegistroDeDocumentos.REEMISION_EN_CURSO.formatted(nuevo)));
    json(
            director.sesion(),
            "/api/anulacion/%s/solicitud".formatted(original),
            "{\"motivo\": \"Error\"}")
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.mensaje").value(AnulacionDeDocumentos.CON_REEMISION.formatted(nuevo)));
    mvc.perform(get("/api/firmados").session(director.sesion()))
        .andExpect(
            jsonPath("$[?(@.codigo == '%s')].reemisionEnCurso".formatted(original)).value(nuevo));

    // El Director la ve en Por revisar como reemisión, con los cambios y el motivo.
    mvc.perform(get("/api/revision").session(director.sesion()))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].reemision".formatted(nuevo)).value(true));
    mvc.perform(post("/api/revision/documentos/" + nuevo).with(csrf()).session(director.sesion()))
        .andExpect(jsonPath("$.reemision.original").value(original))
        .andExpect(jsonPath("$.reemision.motivo").value(MOTIVO))
        .andExpect(
            jsonPath("$.reemision.cambios")
                .value(
                    org.hamcrest.Matchers.contains(
                        "Apellidos: Paredes Quinto → Paredes Quintana",
                        "Cargo: asistente administrativa → secretaria")));

    // Al firmarse: una transacción registra la reemisión y anula el original.
    String tx = firmar(director, nuevo);
    assertThat(contrato.reemplazos.get(tx))
        .singleElement()
        .extracting("codigo")
        .isEqualTo(original);
    confirmar(director, tx, 1);
    assertThat(fila(nuevo).get("estado")).isEqualTo("FIRMADO");
    Map<String, Object> anulado = fila(original);
    assertThat(anulado.get("estado")).isEqualTo("ANULADO");
    assertThat(anulado.get("transaccion_anulacion")).isEqualTo(tx);
    assertThat(anulado.get("motivo_anulacion"))
        .isEqualTo("Reemplazado por %s. Motivo de la reemisión: %s".formatted(nuevo, MOTIVO));
    assertThat(eventos(original).getLast())
        .startsWith("ANULADO|Anulado por reemisión (reemplazado por %s) por ".formatted(nuevo))
        .contains("transacción " + tx);
    mvc.perform(get("/api/documentos/" + original).session(area))
        .andExpect(jsonPath("$.estado").value("ANULADO"))
        .andExpect(jsonPath("$.reemplazadoPor").value(nuevo))
        .andExpect(jsonPath("$.reemisionEnCurso").doesNotExist());
    // Repetir la confirmación no cambia nada.
    confirmar(director, tx, 1);
    assertThat(eventos(original).stream().filter(e -> e.startsWith("ANULADO|"))).hasSize(1);
  }

  @Test
  void soloSeReemiteUnFirmadoDelAreaPropiaConMotivoYAlgunCambio() throws Exception {
    Director director = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    MockHttpSession area = area("ADMINISTRACION");
    String original = firmado(director, area);
    String pendiente = revisado(director, area);

    reemitir(area, original, corregido("Paredes Quintana", "secretaria", "  "))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").exists());
    reemitir(area, original, corregido("Paredes Quintana", "secretaria", "x".repeat(501)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.motivo").exists());
    reemitir(area, original, corregido("Paredes Quinto", "asistente administrativa", MOTIVO))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.mensaje").value(RegistroDeDocumentos.SIN_CAMBIOS));
    reemitir(area, original, corregido("", "secretaria", MOTIVO))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.apellidos").exists());
    reemitir(area, pendiente, corregido("Paredes Quintana", "secretaria", MOTIVO))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(RegistroDeDocumentos.NO_FIRMADO));
    reemitir(area("CAPACITACION"), original, corregido("Paredes Quintana", "secretaria", MOTIVO))
        .andExpect(status().isForbidden());
    reemitir(director.sesion(), original, corregido("Paredes Quintana", "secretaria", MOTIVO))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/documentos/%s/reemision".formatted(original))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(corregido("Paredes Quintana", "secretaria", MOTIVO)))
        .andExpect(status().isUnauthorized());
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento d JOIN documento o ON o.id = d.reemplaza_a"
                    + " WHERE o.codigo = ?",
                Integer.class,
                original))
        .isZero();
  }

  @Test
  void unaReemisionRechazadaDejaFirmadoAlOriginalYUnaObservadaSeCorrigeConSuExpediente()
      throws Exception {
    Director director = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    MockHttpSession area = area("ADMINISTRACION");
    String original = firmado(director, area);

    String primera = reemitido(area, original);
    revisar(director, primera);
    json(
            director.sesion(),
            "/api/revision/documentos/%s/rechazo".formatted(primera),
            "{\"motivo\": \"No corresponde\"}")
        .andExpect(status().isOk());
    assertThat(fila(original).get("estado")).isEqualTo("FIRMADO");

    // Rechazada la primera, se puede volver a reemitir.
    String segunda = reemitido(area, original);
    revisar(director, segunda);
    json(
            director.sesion(),
            "/api/revision/documentos/%s/observacion".formatted(segunda),
            "{\"motivo\": \"Revise el cargo\"}")
        .andExpect(status().isOk());
    // HU15: la corrección mantiene el expediente del original, aunque se envíe otro.
    String expediente = (String) fila(original).get("numero_expediente");
    json(
            area,
            "/api/documentos/%s/correccion".formatted(segunda),
            """
            {"numeroExpediente": "EXP-2026-999999", "nombres": "Lucía",
             "apellidos": "Paredes Quintana", "dni": "45829364",
             "datos": {"cargo": "secretaria ejecutiva", "fechaInicio": "2025-01-02",
                       "fechaFin": "2026-09-30"}}
            """)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("PENDIENTE"))
        .andExpect(jsonPath("$.numeroExpediente").value(expediente))
        .andExpect(jsonPath("$.reemision.original").value(original));

    // Si el original ya no está firmado, la reemisión no se prepara y sigue Pendiente.
    revisar(director, segunda);
    jdbc.update(
        "UPDATE documento SET estado = 'OBSERVADO', motivo = 'Prueba' WHERE codigo = ?", original);
    json(director.sesion(), "/api/firma/preparacion", "{\"codigos\": [\"%s\"]}".formatted(segunda))
        .andExpect(jsonPath("$.preparados.length()").value(0))
        .andExpect(
            jsonPath("$.noPreparados[0].motivo")
                .value(PreparacionDeFirma.ORIGINAL_NO_FIRMADO.formatted(original)));
    assertThat(fila(segunda).get("estado")).isEqualTo("PENDIENTE");
    jdbc.update(
        "UPDATE documento SET estado = 'FIRMADO', motivo = NULL WHERE codigo = ?", original);
  }

  @Test
  void laSincronizacionAplicaLaReemisionSiElNavegadorSeCierra() throws Exception {
    Director director = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    MockHttpSession area = area("ADMINISTRACION");
    String original = firmado(director, area);
    String nuevo = reemitido(area, original);
    revisar(director, nuevo);
    String tx = firmar(director, nuevo);

    sincronizacion.sincronizar(Instant.now());
    assertThat(fila(nuevo).get("transaccion")).isEqualTo(tx);
    assertThat(fila(original).get("estado")).isEqualTo("ANULADO");
    assertThat(fila(original).get("motivo_anulacion"))
        .isEqualTo("Reemplazado por %s. Motivo de la reemisión: %s".formatted(nuevo, MOTIVO));
    assertThat(eventos(original).getLast())
        .startsWith(
            "ANULADO|Anulación confirmada por la sincronización: anulado por reemisión"
                + " (reemplazado por %s)".formatted(nuevo));
  }

  @Test
  void unCertificadoDeUnLoteSeReemiteEnElMismoLoteSinRepetirUnDniVigente() throws Exception {
    Director director = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    MockHttpSession area = area("CAPACITACION");
    int juan = dnis.incrementAndGet();
    int gladys = dnis.incrementAndGet();
    String numero =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        area,
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Poda de cacao",
                                   "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                                   "duracionHoras": "16", "lugar": "Río Negro",
                                   "areaOrganizadora": "Área de Capacitación"},
                         "beneficiarios": [
                           {"nombres": "Juan", "apellidos": "Ccori", "dni": "%d"},
                           {"nombres": "Gladys", "apellidos": "Sanchez", "dni": "%d"}]}
                        """
                            .formatted(juan, gladys))
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
    confirmar(director, firmar(director, codigos.toArray(String[]::new)), 2);
    String original = codigos.get(1);

    String ruta = "/api/documentos/%s/reemision".formatted(original);
    String beneficiario =
        "{\"nombres\": \"Gladys\", \"apellidos\": \"%s\", \"dni\": \"%d\", \"motivo\": \"%s\"}";
    json(area, ruta, beneficiario.formatted("Sánchez", juan, MOTIVO))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.dni").value(RegistroDeDocumentos.DNI_EN_EL_LOTE));
    // El mismo DNI del original no cuenta: el original se anulará.
    String nuevo =
        JsonPath.read(
            cuerpo(
                json(area, ruta, beneficiario.formatted("Sánchez Ñaupari", gladys, MOTIVO))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.lote").value(numero))),
            "$.codigo");
    mvc.perform(get("/api/lotes/" + numero).session(area))
        .andExpect(
            jsonPath("$.documentos[?(@.codigo == '%s')].reemisionEnCurso".formatted(original))
                .value(nuevo))
        .andExpect(
            jsonPath("$.documentos[?(@.codigo == '%s')].reemision.cambios[0]".formatted(nuevo))
                .value("Apellidos: Sanchez → Sánchez Ñaupari"));
    mvc.perform(get("/api/revision").session(director.sesion()))
        .andExpect(jsonPath("$[?(@.lote == '%s')].reemision".formatted(numero)).value(true));

    mvc.perform(post("/api/revision/lotes/" + numero).with(csrf()).session(director.sesion()))
        .andExpect(status().isOk());
    confirmar(director, firmar(director, nuevo), 1);
    assertThat(fila(original).get("estado")).isEqualTo("ANULADO");
    mvc.perform(get("/api/lotes/" + numero).session(area))
        .andExpect(
            jsonPath("$.documentos[?(@.codigo == '%s')].reemplazadoPor".formatted(original))
                .value(nuevo));
  }
}
