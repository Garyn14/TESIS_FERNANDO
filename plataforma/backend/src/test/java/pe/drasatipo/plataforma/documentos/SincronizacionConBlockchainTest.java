package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.documentos.PreparacionDeFirmaTest.Director;

/**
 * HU18 (DRA-26): sincronización con los eventos del contrato y corrección de los documentos
 * detenidos en Procesando firma. La blockchain es el contrato en memoria; la red Besu real se
 * recorre en la prueba de punta a punta.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class SincronizacionConBlockchainTest {

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

  private ResultActions preparar(Director director, String codigo) throws Exception {
    return mvc.perform(
        post("/api/firma/preparacion")
            .with(csrf())
            .session(director.sesion())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"codigos\": [\"%s\"]}".formatted(codigo)));
  }

  /** Prepara el documento y devuelve lo que la billetera registraría: {código, hash, HMAC}. */
  private String[] preparado(Director director, String codigo) throws Exception {
    Map<String, String> p =
        JsonPath.read(
            cuerpo(preparar(director, codigo).andExpect(status().isOk())), "$.preparados[0]");
    return new String[] {p.get("codigo"), p.get("hash"), p.get("dniHmac")};
  }

  private String estado(String codigo) {
    return jdbc.queryForObject(
        "SELECT estado FROM documento WHERE codigo = ?", String.class, codigo);
  }

  private List<Map<String, Object>> historial(String codigo) {
    return jdbc.queryForList(
        "SELECT h.evento, h.detalle, h.realizado_por FROM documento_historial h"
            + " JOIN documento d ON d.id = h.documento_id WHERE d.codigo = ? ORDER BY h.id",
        codigo);
  }

  private long ultimoBloque() {
    return jdbc.queryForObject(
        "SELECT ultimo_bloque FROM sincronizacion_blockchain WHERE id = 1", Long.class);
  }

  @Test
  void unaFirmaRegistradaSinConfirmarSePasaAFirmadoUnaSolaVez() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    // El navegador registró la firma y se cerró antes de confirmarla.
    String transaccion =
        contrato.registrar(director.billetera(), List.<String[]>of(preparado(director, codigo)));
    assertThat(estado(codigo)).isEqualTo("PROCESANDO_FIRMA");

    var resumen = sincronizacion.sincronizar(Instant.now());
    assertThat(resumen.firmados()).isGreaterThanOrEqualTo(1);
    assertThat(resumen.ultimoBloque()).isEqualTo(contrato.bloque);
    assertThat(ultimoBloque()).isEqualTo(contrato.bloque);
    assertThat(estado(codigo)).isEqualTo("FIRMADO");
    Map<String, Object> fila =
        jdbc.queryForMap(
            "SELECT d.transaccion, d.bloque, d.billetera_firmante, u.billetera"
                + " FROM documento d JOIN usuario u ON u.id = d.firmado_por WHERE d.codigo = ?",
            codigo);
    assertThat(fila.get("transaccion")).isEqualTo(transaccion);
    assertThat(fila.get("billetera")).isEqualTo(director.billetera());
    Map<String, Object> evento = historial(codigo).getLast();
    assertThat(evento.get("evento")).isEqualTo("FIRMADO");
    assertThat((String) evento.get("detalle"))
        .startsWith("Firma confirmada por la sincronización con la blockchain: firmado por")
        .contains(transaccion);
    assertThat(evento.get("realizado_por")).isNotNull();

    // Otra ejecución no aplica de nuevo el evento.
    sincronizacion.sincronizar(Instant.now());
    assertThat(historial(codigo)).filteredOn(e -> "FIRMADO".equals(e.get("evento"))).hasSize(1);
  }

  @Test
  void seReanudaDesdeElUltimoBloqueProcesadoEnTramosDe5000() throws Exception {
    sincronizacion.sincronizar(Instant.now());
    long procesado = ultimoBloque();
    Director director = director();
    String codigo = revisado(director);
    contrato.registrar(director.billetera(), List.<String[]>of(preparado(director, codigo)));
    contrato.bloque += 12_000;
    contrato.consultas.clear();

    sincronizacion.sincronizar(Instant.now());
    assertThat(contrato.consultas).hasSize(3);
    assertThat(contrato.consultas.getFirst()[0]).isEqualTo(procesado + 1);
    assertThat(contrato.consultas)
        .allSatisfy(r -> assertThat(r[1] - r[0] + 1).isLessThanOrEqualTo(5000));
    assertThat(contrato.consultas.getLast()[1]).isEqualTo(contrato.bloque);
    assertThat(estado(codigo)).isEqualTo("FIRMADO");

    contrato.consultas.clear();
    sincronizacion.sincronizar(Instant.now());
    assertThat(contrato.consultas).isEmpty();
  }

  @Test
  void unDocumentoDetenidoSinRegistrarVuelveAPendienteSoloPasadoElPlazo() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    preparado(director, codigo);

    sincronizacion.sincronizar(Instant.now());
    assertThat(estado(codigo)).isEqualTo("PROCESANDO_FIRMA");

    var resumen = sincronizacion.sincronizar(Instant.now().plus(Duration.ofMinutes(16)));
    assertThat(resumen.devueltos()).isGreaterThanOrEqualTo(1);
    assertThat(estado(codigo)).isEqualTo("PENDIENTE");
    assertThat(
            jdbc.queryForObject(
                "SELECT revisado_en IS NOT NULL AND cid IS NULL AND firma_iniciada_en IS NULL"
                    + " FROM documento WHERE codigo = ?",
                Boolean.class,
                codigo))
        .isTrue();
    Map<String, Object> evento = historial(codigo).getLast();
    assertThat(evento.get("evento")).isEqualTo("FIRMA_CANCELADA");
    assertThat((String) evento.get("detalle"))
        .isEqualTo(
            "La firma no se completó en el plazo de 15 minutos y no quedó registrada en la"
                + " blockchain (sincronización). Volvió a Pendiente.");
    // Lo hizo el sistema, no una cuenta.
    assertThat(evento.get("realizado_por")).isNull();
  }

  @Test
  void unDetenidoQueEstaRegistradoConOtroHashNoSeMarcaNiSeDevuelve() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    String[] registro = preparado(director, codigo);
    registro[1] = "ef".repeat(32);
    contrato.registrar(director.billetera(), List.<String[]>of(registro));

    sincronizacion.sincronizar(Instant.now().plus(Duration.ofMinutes(30)));
    assertThat(estado(codigo)).isEqualTo("PROCESANDO_FIRMA");
  }

  @Test
  void sinBlockchainNoSeCambiaNada() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    preparado(director, codigo);
    sincronizacion.sincronizar(Instant.now());
    long antes = ultimoBloque();
    contrato.caido = true;
    assertThatThrownBy(() -> sincronizacion.sincronizar(Instant.now().plus(Duration.ofHours(1))))
        .isInstanceOf(BlockchainNoDisponibleException.class);
    assertThat(estado(codigo)).isEqualTo("PROCESANDO_FIRMA");
    assertThat(ultimoBloque()).isEqualTo(antes);
    // La tarea programada no falla: lo reintenta en la siguiente ejecución.
    sincronizacion.ejecutar();
  }

  @Test
  void unCodigoYaRegistradoNoSePreparaDeNuevo() throws Exception {
    Director director = director();
    String codigo = revisado(director);
    contrato.registrados.add(codigo);
    preparar(director, codigo)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preparados.length()").value(0))
        .andExpect(jsonPath("$.noPreparados[0].motivo").value(PreparacionDeFirma.YA_REGISTRADO));
    assertThat(estado(codigo)).isEqualTo("PENDIENTE");
  }
}
