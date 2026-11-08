package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.expedienteNuevo;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;
import pe.drasatipo.plataforma.consulta.BusquedaDeDocumentos;

/** HU22 (DRA-35): Buscar documentos de Mesa de Partes (RF42). */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class BuscarDocumentosTest {

  private static final AtomicInteger dnis = new AtomicInteger(71_000_000);
  private static final AtomicInteger apellidos = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private MockHttpSession sesion(String rol, String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, area);
  }

  private MockHttpSession mesaDePartes() throws Exception {
    return sesion("CONSULTA_INTERNA", null);
  }

  /** Un apellido que no se repite entre pruebas, solo con letras: "Zabqk". */
  private static String apellidoUnico() {
    StringBuilder letras = new StringBuilder("Zab");
    int n = apellidos.incrementAndGet() + (int) (System.nanoTime() % 10_000);
    for (int i = 0; i < 4; i++) {
      letras.append((char) ('a' + n % 26));
      n /= 26;
    }
    return letras.toString();
  }

  private record Enviado(String codigo, String expediente, String dni) {}

  /** Un Certificado de Trabajo de "Rosa Elena Huamán {apellido}". */
  private Enviado documento(String apellido) throws Exception {
    String expediente = expedienteNuevo();
    String dni = String.valueOf(dnis.incrementAndGet());
    String codigo =
        JsonPath.read(
            texto(
                enviar(
                        mvc,
                        sesion("AREA_ENCARGADA", "ADMINISTRACION"),
                        "/api/documentos",
                        """
                        {"tipo": "CERTIFICADO_TRABAJO", "numeroExpediente": "%s",
                         "nombres": "Rosa Elena", "apellidos": "Huamán %s", "dni": "%s",
                         "datos": {"cargo": "secretaria", "fechaInicio": "2025-01-02",
                                   "fechaFin": "2026-09-30"}}
                        """
                            .formatted(expediente, apellido, dni))
                    .andExpect(status().isCreated())),
            "$.codigo");
    return new Enviado(codigo, expediente, dni);
  }

  private record LoteEnviado(String numero, List<String> dnis) {}

  private LoteEnviado lote(int cantidad) throws Exception {
    List<String> dnisDelLote =
        java.util.stream.IntStream.range(0, cantidad)
            .mapToObj(i -> String.valueOf(dnis.incrementAndGet()))
            .toList();
    String filas =
        String.join(
            ",",
            dnisDelLote.stream()
                .map(
                    d ->
                        "{\"nombres\": \"Ana\", \"apellidos\": \"Soto\", \"dni\": \"%s\"}"
                            .formatted(d))
                .toList());
    String numero =
        JsonPath.read(
            texto(
                enviar(
                        mvc,
                        sesion("AREA_ENCARGADA", "CAPACITACION"),
                        "/api/lotes",
                        """
                        {"tipo": "CERTIFICADO_CAPACITACION",
                         "datos": {"nombreEvento": "Manejo de viveros de café",
                                   "fechaInicio": "2026-09-22", "fechaFin": "2026-09-24",
                                   "duracionHoras": "16", "lugar": "Río Negro",
                                   "areaOrganizadora": "Área de Capacitación"},
                         "beneficiarios": [%s]}
                        """
                            .formatted(filas))
                    .andExpect(status().isCreated())),
            "$.numero");
    return new LoteEnviado(numero, dnisDelLote);
  }

  private static String texto(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  private ResultActions buscar(MockHttpSession sesion, String texto, String estado)
      throws Exception {
    return mvc.perform(
        get("/api/consulta/documentos")
            .param("texto", texto)
            .param("estado", estado)
            .session(sesion));
  }

  private List<Map<String, Object>> filas(String texto) throws Exception {
    return filas(texto, "TODOS");
  }

  private List<Map<String, Object>> filas(String texto, String estado) throws Exception {
    return JsonPath.read(
        texto(buscar(mesaDePartes(), texto, estado).andExpect(status().isOk())), "$.filas");
  }

  private static List<Object> codigos(List<Map<String, Object>> filas) {
    return filas.stream().map(f -> f.get("codigo")).toList();
  }

  @Test
  void buscaPorNombreConCoincidenciasParcialesSinTildesYEnCualquierOrden() throws Exception {
    String apellido = apellidoUnico();
    Enviado enviado = documento(apellido);

    // Parte del apellido, varias palabras en cualquier orden, sin tildes ni mayúsculas.
    for (String texto :
        List.of(
            apellido.substring(0, 6),
            apellido.toUpperCase() + " rosa",
            "huaman " + apellido.toLowerCase(),
            "  ELENA   " + apellido + "  ")) {
      assertThat(codigos(filas(texto))).as(texto).containsExactly(enviado.codigo());
    }
    // Todas las palabras deben aparecer.
    assertThat(filas("rosa " + apellido + " perez")).isEmpty();

    buscar(mesaDePartes(), apellido, "TODOS")
        .andExpect(jsonPath("$.filas[0].beneficiario").value("Rosa Elena Huamán " + apellido))
        .andExpect(jsonPath("$.filas[0].tipoNombre").value("Certificado de Trabajo"))
        .andExpect(jsonPath("$.filas[0].areaNombre").value("Área de Administración"))
        .andExpect(jsonPath("$.filas[0].dni").value(enviado.dni()))
        .andExpect(jsonPath("$.filas[0].numeroExpediente").value(enviado.expediente()))
        .andExpect(jsonPath("$.filas[0].estado").value("PENDIENTE"))
        .andExpect(jsonPath("$.filas[0].registradoEn").exists())
        .andExpect(jsonPath("$.filas[0].lote").doesNotExist())
        .andExpect(jsonPath("$.hayMas").value(false));
  }

  @Test
  void buscaPorDniCodigoYExpedienteCompletosOParciales() throws Exception {
    Enviado enviado = documento(apellidoUnico());
    String sinPrefijo = enviado.codigo().substring(9); // DRA-2026-|F8R2MA

    assertThat(codigos(filas(enviado.dni()))).containsExactly(enviado.codigo());
    assertThat(codigos(filas(enviado.dni().substring(2)))).contains(enviado.codigo());
    assertThat(codigos(filas(enviado.codigo()))).containsExactly(enviado.codigo());
    assertThat(codigos(filas(sinPrefijo.toLowerCase()))).contains(enviado.codigo());
    assertThat(codigos(filas(enviado.codigo().toLowerCase().replace('-', ' '))))
        .containsExactly(enviado.codigo());
    assertThat(codigos(filas(enviado.expediente().toLowerCase())))
        .containsExactly(enviado.codigo());
    assertThat(codigos(filas(enviado.expediente().substring(4)))).contains(enviado.codigo());
  }

  @Test
  void elNumeroDeLoteMuestraElLoteCompletoEnUnaFila() throws Exception {
    LoteEnviado lote = lote(3);

    buscar(mesaDePartes(), lote.numero(), "TODOS")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.filas.length()").value(1))
        .andExpect(jsonPath("$.filas[0].lote").value(lote.numero()))
        .andExpect(jsonPath("$.filas[0].codigo").doesNotExist())
        .andExpect(jsonPath("$.filas[0].tipoNombre").value("Certificado de Capacitación"))
        .andExpect(jsonPath("$.filas[0].areaNombre").value("Área de Capacitación"))
        .andExpect(jsonPath("$.filas[0].cantidad").value(3))
        .andExpect(jsonPath("$.filas[0].completo").value(true))
        .andExpect(jsonPath("$.filas[0].certificados.length()").value(3))
        .andExpect(jsonPath("$.filas[0].certificados[0].dni").value(lote.dnis().get(0)))
        .andExpect(jsonPath("$.filas[0].certificados[2].dni").value(lote.dnis().get(2)))
        .andExpect(jsonPath("$.filas[0].certificados[0].beneficiario").value("Ana Soto"))
        .andExpect(jsonPath("$.filas[0].certificados[0].lote").value(lote.numero()));
  }

  @Test
  void unDniDeUnLoteMuestraElLoteSoloConEseCertificado() throws Exception {
    LoteEnviado lote = lote(3);

    buscar(mesaDePartes(), lote.dnis().get(1), "TODOS")
        .andExpect(jsonPath("$.filas.length()").value(1))
        .andExpect(jsonPath("$.filas[0].lote").value(lote.numero()))
        .andExpect(jsonPath("$.filas[0].cantidad").value(3))
        .andExpect(jsonPath("$.filas[0].completo").value(false))
        .andExpect(jsonPath("$.filas[0].certificados.length()").value(1))
        .andExpect(jsonPath("$.filas[0].certificados[0].dni").value(lote.dnis().get(1)))
        .andExpect(jsonPath("$.filas[0].certificados[0].codigo").exists());
  }

  @Test
  void sinResultadosRespondeUnaListaVacia() throws Exception {
    buscar(mesaDePartes(), "Nadie Conestenombre", "TODOS")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.filas.length()").value(0))
        .andExpect(jsonPath("$.hayMas").value(false));
    // Los comodines de LIKE se buscan como texto, no como "cualquier cosa".
    assertThat(filas("%%")).isEmpty();
    assertThat(filas("__")).isEmpty();
  }

  @Test
  void sinTextoMuestraLosMasRecientesPrimero() throws Exception {
    documento(apellidoUnico());
    Enviado ultimo = documento(apellidoUnico());

    List<Map<String, Object>> filas = filas("");
    assertThat(filas.getFirst().get("codigo")).isEqualTo(ultimo.codigo());
    assertThat(filas).hasSizeLessThanOrEqualTo(BusquedaDeDocumentos.MAXIMO_DE_FILAS);
  }

  @Test
  void muestraHastaCincuentaFilasYAvisaSiHayMas() throws Exception {
    String apellido = apellidoUnico();
    documento(apellidoUnico()); // el modelo que se copia 50 veces
    jdbc.update(
        """
        INSERT INTO documento (codigo, token_qr, tipo_documento_id, area_id, origen, estado,
                               numero_expediente, nombres, apellidos, dni, dni_hmac, datos, texto,
                               registrado_por)
        SELECT 'DRA-2026-' || upper(substr(?, 4, 4)) || lpad(n::text, 2, '0'),
               substr(md5(? || n) || md5(? || n), 1, 43), d.tipo_documento_id, d.area_id,
               d.origen, 'PENDIENTE', 'X' || substr(?, 4, 4) || '-' || n, 'Rosa', ?, d.dni,
               d.dni_hmac, d.datos, d.texto, d.registrado_por
        FROM generate_series(1, ?) n,
             (SELECT * FROM documento WHERE origen = 'SOLICITUD_PARTE' LIMIT 1) d
        """,
        apellido,
        apellido,
        apellido,
        apellido,
        apellido,
        BusquedaDeDocumentos.MAXIMO_DE_FILAS);
    buscar(mesaDePartes(), apellido, "TODOS")
        .andExpect(jsonPath("$.filas.length()").value(BusquedaDeDocumentos.MAXIMO_DE_FILAS))
        .andExpect(jsonPath("$.hayMas").value(false));

    documento(apellido);
    buscar(mesaDePartes(), apellido, "TODOS")
        .andExpect(jsonPath("$.filas.length()").value(BusquedaDeDocumentos.MAXIMO_DE_FILAS))
        .andExpect(jsonPath("$.hayMas").value(true));
  }

  @Test
  void filtraPorEstado() throws Exception {
    String apellido = apellidoUnico();
    Enviado pendiente = documento(apellido);
    Enviado rechazado = documento(apellido);
    jdbc.update(
        "UPDATE documento SET estado = 'RECHAZADO', motivo = 'Datos de otra persona'"
            + " WHERE codigo = ?",
        rechazado.codigo());

    assertThat(codigos(filas(apellido, "TODOS")))
        .containsExactlyInAnyOrder(pendiente.codigo(), rechazado.codigo());
    assertThat(codigos(filas(apellido, "EN_TRAMITE"))).containsExactly(pendiente.codigo());
    assertThat(codigos(filas(apellido, "RECHAZADOS"))).containsExactly(rechazado.codigo());
    assertThat(filas(apellido, "FIRMADOS")).isEmpty();
    assertThat(filas(apellido, "ANULADOS")).isEmpty();
    buscar(mesaDePartes(), apellido, "OTRO").andExpect(status().isBadRequest());
  }

  @Test
  void conUnSoloCaracterPideAlMenosDos() throws Exception {
    buscar(mesaDePartes(), " a ", "TODOS")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.texto").value("Escriba al menos 2 caracteres."));
  }

  @Test
  void soloConsultaInternaPuedeBuscar() throws Exception {
    mvc.perform(get("/api/consulta/documentos")).andExpect(status().isUnauthorized());
    for (String rol : List.of("AREA_ENCARGADA", "DIRECTOR", "ADMINISTRADOR")) {
      buscar(sesion(rol, "AREA_ENCARGADA".equals(rol) ? "CAPACITACION" : null), "", "TODOS")
          .andExpect(status().isForbidden());
    }
  }
}
