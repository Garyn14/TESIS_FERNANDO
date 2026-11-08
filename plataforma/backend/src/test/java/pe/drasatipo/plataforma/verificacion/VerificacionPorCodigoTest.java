package pe.drasatipo.plataforma.verificacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.util.UriUtils;
import pe.drasatipo.plataforma.ContenedoresDePrueba;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;
import pe.drasatipo.plataforma.documentos.DocumentosDePrueba;
import pe.drasatipo.plataforma.documentos.DocumentosDePrueba.Director;
import pe.drasatipo.plataforma.documentos.IpfsDePrueba;

/** HU20 (DRA-33): verificar con el código de verificación y límite de consultas por IP. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + DocumentosDePrueba.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class VerificacionPorCodigoTest {

  private static final AtomicInteger visitantes = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  private ResultActions desde(String ip, String ruta) throws Exception {
    // Un URI ya codificado: get(String) volvería a codificar los %20 de los espacios.
    return mvc.perform(
        get(java.net.URI.create(ruta))
            .with(pedido -> {
              pedido.setRemoteAddr(ip);
              return pedido;
            }));
  }

  /** Una IP nueva en cada consulta, para no tocar el límite. */
  private ResultActions porCodigo(String escrito) throws Exception {
    int n = visitantes.incrementAndGet();
    return desde(
        "10.20.%d.%d".formatted(n / 250, n % 250 + 1),
        "/api/verificacion/codigo/" + UriUtils.encodePathSegment(escrito, StandardCharsets.UTF_8));
  }

  @Test
  void conElCodigoSeVerificaYSoloSeEntreganLosDatosBasicos() throws Exception {
    DocumentosDePrueba d = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    String codigo = d.firmado(d.director(), d.area("ADMINISTRACION"));

    String sinGuiones = codigo.replace("-", "");
    for (String escrito :
        new String[] {
          codigo, "  " + codigo.toLowerCase() + " ", codigo.replace("-", " "), sinGuiones
        }) {
      String respuesta =
          porCodigo(escrito)
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.resultado").value("VALIDO"))
              .andExpect(jsonPath("$.tipo").value("Certificado de Trabajo"))
              .andExpect(jsonPath("$.titular").value("Lucía Paredes Quinto"))
              .andExpect(jsonPath("$.fechaEmision").value("2026-11-04T15:30:00Z"))
              .andReturn()
              .getResponse()
              .getContentAsString(StandardCharsets.UTF_8);
      assertThat(respuesta).doesNotContain("45829364").doesNotContain("\"cid\"");
    }
    // Con el código no hay documento completo (RF40).
    desde("10.30.0.1", "/api/verificacion/codigo/%s/documento".formatted(codigo))
        .andExpect(status().isNotFound());
  }

  @Test
  void unCodigoMalFormadoOInexistenteEsNoValidoYUnAnuladoInformaSuFecha() throws Exception {
    for (String escrito :
        new String[] {"DRA-2026-12345", "DRA-2026-ABCDE0", "XYZ", "DRA-26-ABCDEF"}) {
      porCodigo(escrito)
          .andExpect(jsonPath("$.resultado").value("NO_VALIDO"))
          .andExpect(jsonPath("$.titular").doesNotExist());
    }
    porCodigo("DRA-2026-ZZZZZZ").andExpect(jsonPath("$.resultado").value("NO_VALIDO"));

    DocumentosDePrueba d = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    Director director = d.director();
    String codigo = d.firmado(director, d.area("ADMINISTRACION"));
    contrato.anular(director.billetera(), codigo);
    porCodigo(codigo)
        .andExpect(jsonPath("$.resultado").value("ANULADO"))
        .andExpect(jsonPath("$.anuladoEn").value("2026-11-05T10:00:00Z"))
        .andExpect(jsonPath("$.versionCorregida").value(false));
  }

  @Test
  void cadaIpTieneDiezConsultasPorMinutoEntreCodigoYQr() throws Exception {
    String ip = "10.40.0.1";
    for (int i = 0; i < 5; i++) {
      desde(ip, "/api/verificacion/codigo/DRA-2026-ZZZZZZ").andExpect(status().isOk());
      desde(ip, "/api/verificacion/" + "A".repeat(43)).andExpect(status().isOk());
    }
    // La consulta 11 dentro del minuto, con el código o con el QR.
    desde(ip, "/api/verificacion/codigo/DRA-2026-ZZZZZZ")
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.mensaje").value(VerificacionController.DEMASIADAS))
        .andExpect(jsonPath("$.resultado").doesNotExist());
    desde(ip, "/api/verificacion/" + "A".repeat(43)).andExpect(status().isTooManyRequests());
    // Otra IP no se ve afectada.
    desde("10.40.0.2", "/api/verificacion/codigo/DRA-2026-ZZZZZZ").andExpect(status().isOk());
  }
}
