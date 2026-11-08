package pe.drasatipo.plataforma.verificacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
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
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;
import pe.drasatipo.plataforma.documentos.DocumentosDePrueba;
import pe.drasatipo.plataforma.documentos.DocumentosDePrueba.Director;
import pe.drasatipo.plataforma.documentos.IpfsDePrueba;

/** HU21 (DRA-34): comprobar la autenticidad con el contrato y el PDF guardado en IPFS. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + DocumentosDePrueba.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class VerificacionDeAutenticidadTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;
  @Autowired AlmacenDeArchivos almacen;

  @AfterEach
  void sinFallas() {
    contrato.caido = false;
  }

  private DocumentosDePrueba datos() {
    return new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
  }

  private String token(String codigo) {
    return jdbc.queryForObject(
        "SELECT token_qr FROM documento WHERE codigo = ?", String.class, codigo);
  }

  private static final java.util.concurrent.atomic.AtomicInteger visitantes =
      new java.util.concurrent.atomic.AtomicInteger();

  /** Verificación pública, sin sesión, desde otra IP cada vez (el límite por IP es de HU20). */
  private ResultActions verificar(String token) throws Exception {
    int n = visitantes.incrementAndGet();
    return mvc.perform(
        get("/api/verificacion/" + token)
            .with(pedido -> {
              pedido.setRemoteAddr("10.21.%d.%d".formatted(n / 250, n % 250 + 1));
              return pedido;
            }));
  }

  private static String cuerpo(ResultActions r) throws Exception {
    return r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  @Test
  void unFirmadoQueCoincideConSuRegistroEsValidoYNoEntregaDatosInternos() throws Exception {
    DocumentosDePrueba d = datos();
    Director director = d.director();
    String codigo = d.firmado(director, d.area("ADMINISTRACION"));

    String respuesta =
        cuerpo(
            verificar(token(codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultado").value("VALIDO"))
                .andExpect(jsonPath("$.mensaje").value(ResultadoVerificacion.MENSAJE_VALIDO))
                .andExpect(jsonPath("$.tipo").value("Certificado de Trabajo"))
                .andExpect(jsonPath("$.titular").value("Lucía Paredes Quinto"))
                // La fecha de emisión oficial es la del bloque del registro (RF32).
                .andExpect(jsonPath("$.fechaEmision").value("2026-11-04T15:30:00Z"))
                .andExpect(jsonPath("$.anuladoEn").doesNotExist())
                .andExpect(jsonPath("$.versionCorregida").value(false)));
    assertThat(respuesta)
        .doesNotContain("45829364")
        .doesNotContain(codigo)
        .doesNotContainIgnoringCase("hmac")
        .doesNotContain("\"cid\"")
        .doesNotContain("\"dni\"")
        .doesNotContain("\"codigo\"");
  }

  @Test
  void unPdfAlteradoONoRegistradoONoEmitidoEsNoValidoSinDatos() throws Exception {
    DocumentosDePrueba d = datos();
    Director director = d.director();
    MockHttpSession area = d.area("ADMINISTRACION");

    // El PDF guardado en IPFS ya no es el registrado: su SHA-256 no coincide.
    String alterado = d.firmado(director, area);
    String otroCid = almacen.guardar("alterado.pdf", "%PDF-1.7 alterado".getBytes());
    jdbc.update("UPDATE documento SET cid = ? WHERE codigo = ?", otroCid, alterado);
    noValido(token(alterado));

    // El HMAC del DNI de la plataforma no es el registrado.
    String otroDni = d.firmado(director, area);
    jdbc.update("UPDATE documento SET dni_hmac = repeat('0', 64) WHERE codigo = ?", otroDni);
    noValido(token(otroDni));

    // Firmado en la base, pero el contrato no lo tiene registrado.
    String sinRegistro = d.firmado(director, area);
    contrato
        .firmas
        .values()
        .removeIf(f -> f.documentos().stream().anyMatch(x -> x.codigo().equals(sinRegistro)));
    noValido(token(sinRegistro));

    // Un documento Pendiente todavía no está emitido.
    noValido(token(d.revisado(director, area)));

    // Un token inexistente o mal formado.
    noValido("A".repeat(43));
    noValido("no-es-un-token");
  }

  private void noValido(String token) throws Exception {
    verificar(token)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultado").value("NO_VALIDO"))
        .andExpect(jsonPath("$.mensaje").value(ResultadoVerificacion.MENSAJE_NO_VALIDO))
        .andExpect(jsonPath("$.tipo").doesNotExist())
        .andExpect(jsonPath("$.titular").doesNotExist())
        .andExpect(jsonPath("$.fechaEmision").doesNotExist());
  }

  @Test
  void unAnuladoInformaLaFechaYSiTieneUnaVersionCorregidaSinRevelarSuCodigo() throws Exception {
    DocumentosDePrueba d = datos();
    Director director = d.director();
    MockHttpSession area = d.area("ADMINISTRACION");

    // HU29: anulado en el contrato. Manda el contrato aunque la base todavía diga Firmado.
    String anulado = d.firmado(director, area);
    contrato.anular(director.billetera(), anulado);
    verificar(token(anulado))
        .andExpect(jsonPath("$.resultado").value("ANULADO"))
        .andExpect(jsonPath("$.mensaje").value(ResultadoVerificacion.MENSAJE_ANULADO))
        .andExpect(jsonPath("$.titular").value("Lucía Paredes Quinto"))
        .andExpect(jsonPath("$.fechaEmision").value("2026-11-04T15:30:00Z"))
        .andExpect(jsonPath("$.anuladoEn").value("2026-11-05T10:00:00Z"))
        .andExpect(jsonPath("$.versionCorregida").value(false));

    // HU30: reemplazado por una reemisión firmada.
    String original = d.firmado(director, area);
    String nuevo = d.reemitido(area, original);
    d.revisar(director, nuevo);
    d.confirmar(director, d.firmar(director, nuevo), 1);
    String respuesta =
        cuerpo(
            verificar(token(original))
                .andExpect(jsonPath("$.resultado").value("ANULADO"))
                .andExpect(jsonPath("$.anuladoEn").value("2026-11-04T15:30:00Z"))
                .andExpect(jsonPath("$.versionCorregida").value(true)));
    assertThat(respuesta).doesNotContain(nuevo);
    // La reemisión es válida.
    verificar(token(nuevo))
        .andExpect(jsonPath("$.resultado").value("VALIDO"))
        .andExpect(jsonPath("$.titular").value("Lucía Paredes Quintana"));
  }

  @Test
  void siLaBlockchainNoRespondeNoSeInformaNoValido() throws Exception {
    DocumentosDePrueba d = datos();
    String codigo = d.firmado(d.director(), d.area("ADMINISTRACION"));
    contrato.caido = true;
    verificar(token(codigo))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.mensaje").value(VerificacionDeAutenticidad.NO_DISPONIBLE))
        .andExpect(jsonPath("$.resultado").doesNotExist());
  }

  @Test
  void laVerificacionEsPublicaYDeSoloLectura() throws Exception {
    DocumentosDePrueba d = datos();
    Director director = d.director();
    String codigo = d.firmado(director, d.area("ADMINISTRACION"));
    int firmas = contrato.firmas.size();
    int anulaciones = contrato.anulaciones.size();
    long bloque = contrato.bloque;
    for (int i = 0; i < 3; i++) {
      verificar(token(codigo)).andExpect(jsonPath("$.resultado").value("VALIDO"));
    }
    // No envía transacciones ni cambia nada en el contrato ni en la base.
    assertThat(contrato.firmas).hasSize(firmas);
    assertThat(contrato.anulaciones).hasSize(anulaciones);
    assertThat(contrato.bloque).isEqualTo(bloque);
    assertThat(
            jdbc.queryForObject(
                "SELECT estado FROM documento WHERE codigo = ?", String.class, codigo))
        .isEqualTo("FIRMADO");
    // Solo GET: otro método requiere sesión.
    mvc.perform(post("/api/verificacion/" + token(codigo)).with(csrf()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void elDocumentoCompletoSoloSeEntregaSiEsValidoYSinCache() throws Exception {
    DocumentosDePrueba d = datos();
    Director director = d.director();
    MockHttpSession area = d.area("ADMINISTRACION");
    String valido = d.firmado(director, area);
    var respuesta =
        mvc.perform(get("/api/verificacion/%s/documento".formatted(token(valido))))
            .andExpect(status().isOk())
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                    .contentType("application/pdf"))
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                    .string("Cache-Control", "no-store"))
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                    .string("X-Frame-Options", "SAMEORIGIN"))
            .andReturn()
            .getResponse();
    // Es el PDF cuyo hash está registrado en el contrato.
    String hash = VerificacionDeAutenticidad.sha256(respuesta.getContentAsByteArray());
    assertThat(contrato.registroDe(valido).orElseThrow().hashPdf()).isEqualTo(hash);
    assertThat(respuesta.getHeader("Content-Disposition"))
        .startsWith("inline")
        .doesNotContain(valido);

    // Anulado, no válido o con un token inválido: no se entrega.
    String anulado = d.firmado(director, area);
    contrato.anular(director.billetera(), anulado);
    for (String t : List.of(token(anulado), token(d.revisado(director, area)), "x")) {
      mvc.perform(get("/api/verificacion/%s/documento".formatted(t)))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.mensaje").value(VerificacionController.SIN_DOCUMENTO));
    }
  }
}
