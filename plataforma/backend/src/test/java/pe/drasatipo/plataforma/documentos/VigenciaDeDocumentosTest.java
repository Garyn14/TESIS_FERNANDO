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
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
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
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;
import pe.drasatipo.plataforma.config.RelojDePrueba;

/**
 * DRA-62: vigencia opcional por tipo de documento. La fecha de vencimiento se imprime en el PDF
 * (opción A) y la verificación la contrasta con la guardada.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({
  ContenedoresDePrueba.class,
  IpfsDePrueba.class,
  ContratoFalso.Configuracion.class,
  RelojDePrueba.Configuracion.class
})
class VigenciaDeDocumentosTest {

  private static final AtomicInteger visitantes = new AtomicInteger();
  private static final String RUTA_VIGENCIA = "/api/catalogo/tipos-documento/%s/vigencia";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired AlmacenDeArchivos almacen;
  @Autowired RelojDePrueba reloj;

  private DocumentosDePrueba ayuda;
  private DocumentosDePrueba.Director director;
  private MockHttpSession emisor;
  private MockHttpSession admin;
  private MockHttpSession mesaDePartes;

  @BeforeEach
  void preparar() throws Exception {
    ayuda = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    director = ayuda.director();
    emisor = ayuda.area("ADMINISTRACION");
    admin = RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "ADMINISTRADOR", null);
    mesaDePartes =
        RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "CONSULTA_INTERNA", null);
  }

  /** Ningún tipo vence, como en V28, y el reloj vuelve a hoy. */
  @AfterEach
  void restaurar() {
    jdbc.update("UPDATE tipo_documento SET vigencia_meses = NULL");
    reloj.volverAHoy();
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private ResultActions vigencia(MockHttpSession sesion, String tipo, Integer meses)
      throws Exception {
    return mvc.perform(
        put(RUTA_VIGENCIA.formatted(tipo))
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"meses\": %s}".formatted(meses)));
  }

  /** Verifica por código desde una IP nueva, para no tocar el límite de consultas. */
  private ResultActions verificar(String ruta) throws Exception {
    int n = visitantes.incrementAndGet();
    return mvc.perform(
        get(java.net.URI.create(ruta))
            .with(pedido -> {
              pedido.setRemoteAddr("10.62.%d.%d".formatted(n / 250, n % 250 + 1));
              return pedido;
            }));
  }

  private ResultActions porCodigo(String codigo) throws Exception {
    return verificar("/api/verificacion/codigo/" + codigo);
  }

  private String token(String codigo) {
    return jdbc.queryForObject(
        "SELECT token_qr FROM documento WHERE codigo = ?", String.class, codigo);
  }

  private LocalDate fecha(String columna, String codigo) {
    return jdbc.queryForObject(
        "SELECT " + columna + " FROM documento WHERE codigo = ?", LocalDate.class, codigo);
  }

  private String textoDelPdf(String codigo) throws Exception {
    byte[] pdf =
        almacen.recuperar(
            jdbc.queryForObject(
                "SELECT cid FROM documento WHERE codigo = ?", String.class, codigo));
    return new com.lowagie.text.pdf.parser.PdfTextExtractor(new com.lowagie.text.pdf.PdfReader(pdf))
        .getTextFromPage(1)
        .replaceAll("\\s+", " ");
  }

  private List<String> buscar(String filtro) throws Exception {
    return JsonPath.read(
        cuerpo(
            mvc.perform(
                    get("/api/consulta/documentos?texto=45829364&estado=" + filtro)
                        .session(mesaDePartes))
                .andExpect(status().isOk())),
        "$.filas[*].codigo");
  }

  @Test
  void sinVigenciaTodoSigueIgual() throws Exception {
    String codigo = ayuda.firmado(director, emisor);
    assertThat(fecha("vence_en", codigo)).isNull();
    assertThat(textoDelPdf(codigo)).contains("Fecha de emisión").doesNotContain("Válido hasta");
    porCodigo(codigo)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultado").value("VALIDO"))
        .andExpect(jsonPath("$.venceEn").doesNotExist());
    reloj.adelantar(Duration.ofDays(3650));
    porCodigo(codigo).andExpect(jsonPath("$.resultado").value("VALIDO"));
  }

  @Test
  void soloElAdministradorCambiaLaVigenciaYQuedaEnElHistorial() throws Exception {
    vigencia(emisor, "CERTIFICADO_TRABAJO", 12).andExpect(status().isForbidden());
    vigencia(mesaDePartes, "CERTIFICADO_TRABAJO", 12).andExpect(status().isForbidden());
    for (int invalido : new int[] {0, 121, -3}) {
      vigencia(admin, "CERTIFICADO_TRABAJO", invalido)
          .andExpect(status().isBadRequest())
          .andExpect(
              jsonPath("$.mensaje")
                  .value("La vigencia debe ser de 1 a 120 meses, o sin vencimiento."));
    }
    vigencia(admin, "NO_EXISTE", 12).andExpect(status().isNotFound());
    vigencia(admin, "CERTIFICADO_TRABAJO", 12)
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.tipos[?(@.codigo == 'CERTIFICADO_TRABAJO')].vigenciaMeses")
                .value(org.hamcrest.Matchers.contains(12)))
        .andExpect(jsonPath("$.historial[0].evento").value("VIGENCIA_CAMBIADA"))
        .andExpect(
            jsonPath("$.historial[0].detalle")
                .value("Certificado de Trabajo: vigencia de 12 meses"))
        .andExpect(jsonPath("$.historial[0].area").doesNotExist());
    vigencia(admin, "CERTIFICADO_TRABAJO", 12)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("«Certificado de Trabajo» ya tenía esa vigencia."));
    vigencia(admin, "CERTIFICADO_TRABAJO", 1)
        .andExpect(
            jsonPath("$.historial[0].detalle").value("Certificado de Trabajo: vigencia de 1 mes"));
    vigencia(admin, "CERTIFICADO_TRABAJO", null)
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.historial[0].detalle").value("Certificado de Trabajo: sin vencimiento"));
  }

  @Test
  void alFirmarSeImprimeLaFechaYLosCambiosPosterioresNoLaTocan() throws Exception {
    vigencia(admin, "CERTIFICADO_TRABAJO", 12).andExpect(status().isOk());
    // La vista previa del registro informa la vigencia del tipo.
    RegistroSolicitudDePartePrueba.enviar(
            mvc,
            emisor,
            "/api/documentos/vista-previa",
            RegistroSolicitudDePartePrueba.trabajo(
                RegistroSolicitudDePartePrueba.expedienteNuevo()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vigenciaMeses").value(12));
    String codigo = ayuda.firmado(director, emisor);
    LocalDate emitido = fecha("fecha_emision", codigo);
    LocalDate vence = fecha("vence_en", codigo);
    assertThat(vence).isEqualTo(emitido.plusMonths(12));
    assertThat(textoDelPdf(codigo)).contains(GeneradorDePdf.validoHasta(vence));

    vigencia(admin, "CERTIFICADO_TRABAJO", null).andExpect(status().isOk());
    assertThat(fecha("vence_en", codigo)).isEqualTo(vence);
    porCodigo(codigo)
        .andExpect(jsonPath("$.resultado").value("VALIDO"))
        .andExpect(jsonPath("$.venceEn").value(vence.toString()));
    mvc.perform(get("/api/consulta/documentos/" + codigo).session(mesaDePartes))
        .andExpect(jsonPath("$.venceEn").value(vence.toString()))
        .andExpect(jsonPath("$.vencido").value(false));
    // Un documento firmado después ya no vence.
    String despues = ayuda.firmado(director, emisor);
    assertThat(fecha("vence_en", despues)).isNull();
  }

  @Test
  void elUltimoDiaEsValidoYDesdeElSiguienteEstaVencido() throws Exception {
    vigencia(admin, "CERTIFICADO_TRABAJO", 1).andExpect(status().isOk());
    String codigo = ayuda.firmado(director, emisor);
    LocalDate vence = fecha("vence_en", codigo);
    long diasHastaElVencimiento =
        java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(reloj), vence);

    reloj.adelantar(Duration.ofDays(diasHastaElVencimiento));
    porCodigo(codigo).andExpect(jsonPath("$.resultado").value("VALIDO"));

    reloj.adelantar(Duration.ofDays(diasHastaElVencimiento + 1));
    String mensaje =
        "Este documento venció el %s y ya no está vigente."
            .formatted(GeneradorDePdf.enLetras(vence));
    for (String ruta :
        new String[] {"/api/verificacion/codigo/" + codigo, "/api/verificacion/" + token(codigo)}) {
      verificar(ruta)
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.resultado").value("VENCIDO"))
          .andExpect(jsonPath("$.mensaje").value(mensaje))
          .andExpect(jsonPath("$.tipo").value("Certificado de Trabajo"))
          .andExpect(jsonPath("$.titular").value("Lucía Paredes Quinto"))
          .andExpect(jsonPath("$.fechaEmision").exists())
          .andExpect(jsonPath("$.venceEn").value(vence.toString()));
    }
    // El portal no muestra el PDF de un documento vencido, igual que uno anulado.
    verificar("/api/verificacion/%s/documento".formatted(token(codigo)))
        .andExpect(status().isNotFound());

    // Mesa de Partes: la ficha lo marca, no se entrega y aparece en "Vencidos".
    mvc.perform(get("/api/consulta/documentos/" + codigo).session(mesaDePartes))
        .andExpect(jsonPath("$.estado").value("FIRMADO"))
        .andExpect(jsonPath("$.vencido").value(true));
    String noSeEntrega =
        "Este documento venció el %s; no se puede entregar."
            .formatted(GeneradorDePdf.enLetras(vence));
    mvc.perform(get("/api/consulta/documentos/%s/pdf".formatted(codigo)).session(mesaDePartes))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(noSeEntrega));
    mvc.perform(
            post("/api/consulta/documentos/%s/entregas".formatted(codigo))
                .with(csrf())
                .session(mesaDePartes)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"forma\": \"IMPRESION\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value(noSeEntrega));
    assertThat(buscar("VENCIDOS")).contains(codigo);
    assertThat(buscar("LISTOS_PARA_ENTREGAR")).doesNotContain(codigo);
    List<Boolean> marcas =
        JsonPath.read(
            cuerpo(
                mvc.perform(get("/api/consulta/documentos?texto=" + codigo).session(mesaDePartes))),
            "$.filas[*].vencido");
    assertThat(marcas).containsExactly(true);
  }

  @Test
  void unDocumentoVencidoYAnuladoSeInformaAnulado() throws Exception {
    vigencia(admin, "CERTIFICADO_TRABAJO", 1).andExpect(status().isOk());
    String codigo = ayuda.firmado(director, emisor);
    json(
            director.sesion(),
            "/api/anulacion/%s/solicitud".formatted(codigo),
            "{\"motivo\": \"Se emitió con datos de otra persona\"}")
        .andExpect(status().isOk());
    json(
            director.sesion(),
            "/api/anulacion/%s/confirmacion".formatted(codigo),
            "{\"transaccion\": \"%s\"}".formatted(contrato.anular(director.billetera(), codigo)))
        .andExpect(status().isOk());
    reloj.adelantar(Duration.ofDays(400));
    porCodigo(codigo).andExpect(jsonPath("$.resultado").value("ANULADO"));
  }

  @Test
  void siLaFechaGuardadaNoEsLaDelPdfElDocumentoNoEsValido() throws Exception {
    vigencia(admin, "CERTIFICADO_TRABAJO", 12).andExpect(status().isOk());
    String alargado = ayuda.firmado(director, emisor);
    jdbc.update(
        "UPDATE documento SET vence_en = vence_en + INTERVAL '5 years' WHERE codigo = ?", alargado);
    porCodigo(alargado).andExpect(jsonPath("$.resultado").value("NO_VALIDO"));
    String sinFecha = ayuda.firmado(director, emisor);
    jdbc.update("UPDATE documento SET vence_en = NULL WHERE codigo = ?", sinFecha);
    porCodigo(sinFecha).andExpect(jsonPath("$.resultado").value("NO_VALIDO"));
    vigencia(admin, "CERTIFICADO_TRABAJO", null).andExpect(status().isOk());
    String conFechaInventada = ayuda.firmado(director, emisor);
    jdbc.update(
        "UPDATE documento SET vence_en = fecha_emision + 30 WHERE codigo = ?", conFechaInventada);
    porCodigo(conFechaInventada).andExpect(jsonPath("$.resultado").value("NO_VALIDO"));
  }

  private ResultActions json(MockHttpSession sesion, String ruta, String cuerpo) throws Exception {
    return mvc.perform(
        post(ruta)
            .with(csrf())
            .session(sesion)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo));
  }
}
