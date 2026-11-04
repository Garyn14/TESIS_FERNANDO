package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.expedienteNuevo;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.trabajo;

import com.jayway.jsonpath.JsonPath;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
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
import pe.drasatipo.plataforma.almacenamiento.AlmacenIpfs;
import pe.drasatipo.plataforma.almacenamiento.AlmacenamientoNoDisponibleException;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/** HU17 (DRA-25): preparación de la firma con el PDF final en un nodo IPFS real (Kubo). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class PreparacionDeFirmaTest {

  private static int dni = 60_000_000;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired AlmacenIpfs ipfs;
  @Autowired ContratoFalso contrato;

  @AfterEach
  void sinFallas() {
    IpfsDePrueba.FALLAN.clear();
    contrato.caido = false;
  }

  private MockHttpSession sesion(String rol, String area) throws Exception {
    if ("DIRECTOR".equals(rol)) {
      return directorFirmante(mvc, jdbc, codificador, contrato).sesion();
    }
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  record Director(MockHttpSession sesion, String billetera) {}

  private static final java.util.concurrent.atomic.AtomicInteger billeteras =
      new java.util.concurrent.atomic.AtomicInteger(0xd1000);

  /** Un Director con billetera registrada y con el rol de firmante en el contrato (HU06). */
  static Director directorFirmante(
      MockMvc mvc, JdbcTemplate jdbc, PasswordEncoder codificador, ContratoFalso contrato)
      throws Exception {
    MockHttpSession sesion =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "DIRECTOR", null);
    String billetera = "0x%040x".formatted(billeteras.incrementAndGet());
    jdbc.update(
        "UPDATE usuario SET billetera = ? WHERE id = (SELECT max(id) FROM usuario)", billetera);
    contrato.firmantes.add(billetera);
    return new Director(sesion, billetera);
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private String documento() throws Exception {
    return JsonPath.read(
        cuerpo(
            enviar(
                    mvc,
                    sesion("AREA_ENCARGADA", "ADMINISTRACION"),
                    "/api/documentos",
                    trabajo(expedienteNuevo()))
                .andExpect(status().isCreated())),
        "$.codigo");
  }

  private String revisado(MockHttpSession director) throws Exception {
    String codigo = documento();
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director))
        .andExpect(status().isOk());
    return codigo;
  }

  private ResultActions preparar(MockHttpSession sesion, String... codigos) throws Exception {
    String lista =
        java.util.Arrays.stream(codigos).map(c -> '"' + c + '"').collect(Collectors.joining(","));
    return mvc.perform(
        post("/api/firma/preparacion")
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"codigos\": [%s]}".formatted(lista)));
  }

  private Map<String, Object> fila(String codigo) {
    return jdbc.queryForMap(
        "SELECT estado, hash_pdf, cid, fecha_emision, preparado_en FROM documento WHERE codigo = ?",
        codigo);
  }

  private List<String> eventos(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento FROM documento_historial h JOIN documento d ON d.id = h.documento_id"
            + " WHERE d.codigo = ? ORDER BY h.id",
        String.class,
        codigo);
  }

  private static String sha256(byte[] contenido) throws Exception {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido));
  }

  private static String kubo(String operacion) throws Exception {
    return HttpClient.newHttpClient()
        .send(
            HttpRequest.newBuilder(URI.create(IpfsDePrueba.apiIpfs() + "/api/v0/" + operacion))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString())
        .body();
  }

  @Test
  void guardaElPdfFinalEnIpfsFijadoYConservaSuCidYSuHash() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String codigo = revisado(director);

    String respuesta =
        cuerpo(
            preparar(director, codigo)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preparados.length()").value(1))
                .andExpect(jsonPath("$.noPreparados.length()").value(0))
                .andExpect(jsonPath("$.preparados[0].codigo").value(codigo)));
    String hash = JsonPath.read(respuesta, "$.preparados[0].hash");
    String cid = JsonPath.read(respuesta, "$.preparados[0].cid");
    assertThat(hash).matches("[0-9a-f]{64}");
    assertThat(cid).startsWith("bafy");

    Map<String, Object> fila = fila(codigo);
    assertThat(fila.get("estado")).isEqualTo("PROCESANDO_FIRMA");
    assertThat(fila.get("cid")).isEqualTo(cid);
    assertThat(fila.get("hash_pdf")).isEqualTo(hash);
    assertThat(fila.get("fecha_emision").toString())
        .isEqualTo(LocalDate.now(ZoneId.of("America/Lima")).toString());
    assertThat(fila.get("preparado_en")).isNotNull();
    assertThat(eventos(codigo)).containsExactly("REGISTRADO", "REVISADO", "PREPARADO");

    // Lo recuperado de IPFS por su CID es exactamente el archivo del hash (RF30).
    byte[] pdf = ipfs.recuperar(cid);
    assertThat(sha256(pdf)).isEqualTo(hash);
    PdfReader lector = new PdfReader(pdf);
    String texto = new PdfTextExtractor(lector).getTextFromPage(1).replaceAll("\\s+", " ");
    lector.close();
    assertThat(texto).contains(codigo).contains("Fecha de emisión:").doesNotContain("MUESTRA");
    // Fijado (pin) en el nodo: el recolector de basura no lo borra.
    assertThat(kubo("pin/ls?arg=" + cid)).contains("\"recursive\"");

    // Sale de Por revisar y el área lo ve en Procesando firma.
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')]".formatted(codigo)).isEmpty());
    mvc.perform(get("/api/documentos").session(sesion("AREA_ENCARGADA", "ADMINISTRACION")))
        .andExpect(
            jsonPath("$[?(@.codigo == '%s')].estado".formatted(codigo)).value("PROCESANDO_FIRMA"));
  }

  @Test
  void soloPreparaLosPendientesRevisadosEInformaLosDemasSinDetenerse() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String sinRevisar = documento();
    String listo = revisado(director);
    String yaPreparado = revisado(director);
    preparar(director, yaPreparado).andExpect(jsonPath("$.preparados.length()").value(1));

    preparar(director, sinRevisar, "DRA-2026-NOEXIS", listo, yaPreparado)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preparados.length()").value(1))
        .andExpect(jsonPath("$.preparados[0].codigo").value(listo))
        .andExpect(jsonPath("$.noPreparados.length()").value(3))
        .andExpect(jsonPath("$.noPreparados[0].codigo").value(sinRevisar))
        .andExpect(jsonPath("$.noPreparados[0].motivo").value(PreparacionDeFirma.SIN_REVISAR))
        .andExpect(jsonPath("$.noPreparados[1].motivo").value(PreparacionDeFirma.NO_EXISTE))
        .andExpect(jsonPath("$.noPreparados[2].codigo").value(yaPreparado))
        .andExpect(jsonPath("$.noPreparados[2].motivo").value(PreparacionDeFirma.EN_PROCESO));
    assertThat(fila(sinRevisar).get("estado")).isEqualTo("PENDIENTE");
    assertThat(fila(sinRevisar).get("cid")).isNull();
  }

  @Test
  void siIpfsFallaElDocumentoVuelveAPendienteConElErrorYLosDemasSiguen() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String falla = revisado(director);
    String sigue = revisado(director);
    IpfsDePrueba.FALLAN.add(falla + ".pdf");

    preparar(director, falla, sigue)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preparados.length()").value(1))
        .andExpect(jsonPath("$.preparados[0].codigo").value(sigue))
        .andExpect(jsonPath("$.noPreparados.length()").value(1))
        .andExpect(jsonPath("$.noPreparados[0].codigo").value(falla))
        .andExpect(
            jsonPath("$.noPreparados[0].motivo").value(PreparacionDeFirma.FALLO_ALMACENAMIENTO));

    Map<String, Object> fila = fila(falla);
    assertThat(fila.get("estado")).isEqualTo("PENDIENTE");
    assertThat(fila.get("cid")).isNull();
    assertThat(fila.get("hash_pdf")).isNull();
    assertThat(eventos(falla)).containsExactly("REGISTRADO", "REVISADO", "ERROR_ALMACENAMIENTO");
    assertThat(fila(sigue).get("estado")).isEqualTo("PROCESANDO_FIRMA");
    // Vuelve a Por revisar, ya revisado, y se puede preparar de nuevo cuando IPFS responde.
    mvc.perform(get("/api/revision").session(director))
        .andExpect(jsonPath("$[?(@.codigo == '%s')].revisado".formatted(falla)).value(true));
    IpfsDePrueba.FALLAN.clear();
    preparar(director, falla).andExpect(jsonPath("$.preparados[0].codigo").value(falla));
    assertThat(eventos(falla)).endsWith("ERROR_ALMACENAMIENTO", "PREPARADO");
  }

  @Test
  void losCertificadosDeUnLoteSeGuardanCadaUnoConSuCid() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String filas =
        IntStream.range(0, 3)
            .mapToObj(
                i ->
                    "{\"nombres\": \"Rosa\", \"apellidos\": \"Inga\", \"dni\": \"%d\"}"
                        .formatted(++dni))
            .collect(Collectors.joining(","));
    String numero =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        sesion("AREA_ENCARGADA", "CAPACITACION"),
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Injertos en cacao",
                                   "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                                   "duracionHoras": "16", "lugar": "Mazamari",
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

    String respuesta =
        cuerpo(
            preparar(director, codigos.toArray(String[]::new))
                .andExpect(jsonPath("$.preparados.length()").value(3)));
    List<String> cids = JsonPath.read(respuesta, "$.preparados[*].cid");
    assertThat(Set.copyOf(cids)).hasSize(3);
  }

  @Test
  void soloElDirectorPreparaYConUnaSeleccionValida() throws Exception {
    String codigo = documento();
    mvc.perform(
            post("/api/firma/preparacion")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigos\": [\"%s\"]}".formatted(codigo)))
        .andExpect(status().isUnauthorized());
    preparar(sesion("AREA_ENCARGADA", "ADMINISTRACION"), codigo).andExpect(status().isForbidden());
    preparar(sesion("ADMINISTRADOR", null), codigo).andExpect(status().isForbidden());

    MockHttpSession director = sesion("DIRECTOR", null);
    preparar(director)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigos").value(PreparacionDeFirma.SIN_CODIGOS));
    String[] demasiados =
        IntStream.range(0, 301).mapToObj(i -> "DRA-2026-X%05d".formatted(i)).toArray(String[]::new);
    preparar(director, demasiados)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigos").value(PreparacionDeFirma.DEMASIADOS));
  }

  @Test
  void dosPreparacionesALaVezDelMismoDocumentoSoloGuardanUnPdf() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String codigo = revisado(director);
    java.util.concurrent.CountDownLatch salida = new java.util.concurrent.CountDownLatch(1);
    java.util.concurrent.ExecutorService hilos =
        java.util.concurrent.Executors.newFixedThreadPool(4);
    List<java.util.concurrent.Future<Integer>> envios = new java.util.ArrayList<>();
    for (int i = 0; i < 4; i++) {
      envios.add(
          hilos.submit(
              () -> {
                salida.await();
                String respuesta = cuerpo(preparar(director, codigo).andExpect(status().isOk()));
                return JsonPath.<Integer>read(respuesta, "$.preparados.length()");
              }));
    }
    salida.countDown();
    int preparados = 0;
    for (java.util.concurrent.Future<Integer> envio : envios) {
      preparados += envio.get();
    }
    hilos.shutdown();
    assertThat(preparados).isEqualTo(1);
    assertThat(eventos(codigo)).containsExactly("REGISTRADO", "REVISADO", "PREPARADO");
  }

  @Test
  void sinBilleteraOSinElRolDeFirmanteNoSePreparaNada() throws Exception {
    MockHttpSession revisor = sesion("DIRECTOR", null);
    String codigo = revisado(revisor);
    MockHttpSession sinBilletera =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "DIRECTOR", null);
    preparar(sinBilletera, codigo)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(PreparacionDeFirma.SIN_BILLETERA));

    Director revocado = directorFirmante(mvc, jdbc, codificador, contrato);
    contrato.firmantes.remove(revocado.billetera());
    preparar(revocado.sesion(), codigo)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(PreparacionDeFirma.NO_ES_FIRMANTE));

    contrato.caido = true;
    preparar(revisor, codigo).andExpect(status().isServiceUnavailable());
    assertThat(fila(codigo).get("estado")).isEqualTo("PENDIENTE");
  }

  @Test
  void unLoteSeSeleccionaEnteroYLaRespuestaTraeElHmacDelDni() throws Exception {
    MockHttpSession director = sesion("DIRECTOR", null);
    String filas =
        IntStream.range(0, 2)
            .mapToObj(
                i ->
                    "{\"nombres\": \"Ana\", \"apellidos\": \"Rojas\", \"dni\": \"%d\"}"
                        .formatted(++dni))
            .collect(Collectors.joining(","));
    String numero =
        JsonPath.read(
            cuerpo(
                enviar(
                        mvc,
                        sesion("AREA_ENCARGADA", "CAPACITACION"),
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Poda de café",
                                   "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                                   "duracionHoras": "16", "lugar": "Pangoa",
                                   "areaOrganizadora": "Área de Capacitación"},
                         "beneficiarios": [%s]}
                        """
                            .formatted(filas))
                    .andExpect(status().isCreated())),
            "$.numero");
    mvc.perform(post("/api/revision/lotes/" + numero).with(csrf()).session(director))
        .andExpect(status().isOk());
    String suelto = revisado(director);

    String respuesta =
        cuerpo(
            mvc.perform(
                    post("/api/firma/preparacion")
                        .with(csrf())
                        .session(director)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            "{\"codigos\": [\"%s\"], \"lotes\": [\"%s\"]}"
                                .formatted(suelto, numero)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preparados.length()").value(3)));
    List<String> hmacs = JsonPath.read(respuesta, "$.preparados[*].dniHmac");
    String codigo = JsonPath.read(respuesta, "$.preparados[0].codigo");
    assertThat(hmacs).allMatch(h -> h.matches("[0-9a-f]{64}"));
    assertThat(hmacs.get(0))
        .isEqualTo(
            jdbc.queryForObject(
                "SELECT dni_hmac FROM documento WHERE codigo = ?", String.class, codigo));

    mvc.perform(
            post("/api/firma/preparacion")
                .with(csrf())
                .session(director)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"lotes\": [\"2099-999\"]}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensaje").value(PreparacionDeFirma.LOTE_NO_EXISTE));
  }

  @Test
  void sinRespuestaDelNodoElAlmacenAvisaConSuPropiaExcepcion() {
    AlmacenIpfs sinNodo = new AlmacenIpfs("http://127.0.0.1:9", Duration.ofSeconds(2));
    assertThatThrownBy(() -> sinNodo.guardar("x.pdf", new byte[] {1, 2, 3}))
        .isInstanceOf(AlmacenamientoNoDisponibleException.class);
    assertThatThrownBy(() -> sinNodo.recuperar("bafyinexistente"))
        .isInstanceOf(AlmacenamientoNoDisponibleException.class);
  }
}
