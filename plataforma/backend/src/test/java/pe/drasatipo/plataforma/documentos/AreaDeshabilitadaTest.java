package pe.drasatipo.plataforma.documentos;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
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
 * DRA-61: deshabilitar un área solo impide registrar documentos nuevos en ella. Lo ya registrado
 * sigue su trámite: el Director firma lo pendiente, el firmado se verifica en el portal y se anula.
 */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, IpfsDePrueba.class, ContratoFalso.Configuracion.class})
class AreaDeshabilitadaTest {

  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  /** Deja deshabilitada el área de la prueba aunque falle, para no afectar a las demás. */
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

  /** Un área nueva que emite el Certificado de Trabajo, como la crea el Administrador. */
  private String areaNueva() {
    String codigo = "DESHABILITADA_" + secuencia.incrementAndGet();
    jdbc.update(
        "INSERT INTO area (codigo, nombre) VALUES (?, ?)", codigo, "Área " + codigo.toLowerCase());
    jdbc.update(
        """
        INSERT INTO area_tipo_documento (area_id, tipo_documento_id)
        SELECT a.id, t.id FROM area a, tipo_documento t
        WHERE a.codigo = ? AND t.codigo = 'CERTIFICADO_TRABAJO'
        """,
        codigo);
    return codigo;
  }

  @Test
  void loRegistradoSigueSuTramiteDespuesDeDeshabilitarElArea() throws Exception {
    DocumentosDePrueba ayuda = new DocumentosDePrueba(mvc, jdbc, codificador, contrato);
    DocumentosDePrueba.Director director = ayuda.director();
    String area = areaNueva();
    MockHttpSession emisor = ayuda.area(area);
    String firmado = ayuda.firmado(director, emisor);
    String pendiente = ayuda.revisado(director, emisor);

    // Como en la pantalla: primero se desactiva a la persona y después se deshabilita el área.
    jdbc.update(
        "UPDATE usuario SET activo = false WHERE area_id = (SELECT id FROM area WHERE codigo = ?)",
        area);
    jdbc.update("UPDATE area SET activa = false WHERE codigo = ?", area);

    // El Director firma lo que quedó pendiente.
    ayuda.confirmar(director, ayuda.firmar(director, pendiente), 1);

    // El firmado sigue siendo válido en el portal (por código) y el Director lo puede anular.
    mvc.perform(
            get(java.net.URI.create("/api/verificacion/codigo/" + firmado))
                .with(pedido -> {
                  pedido.setRemoteAddr("10.61.0.1");
                  return pedido;
                }))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resultado").value("VALIDO"));
    json(
            director.sesion(),
            "/api/anulacion/%s/solicitud".formatted(firmado),
            "{\"motivo\": \"El área cerró y el certificado se emitió por error\"}")
        .andExpect(status().isOk());
    json(
            director.sesion(),
            "/api/anulacion/%s/confirmacion".formatted(firmado),
            "{\"transaccion\": \"%s\"}".formatted(contrato.anular(director.billetera(), firmado)))
        .andExpect(status().isOk());
    org.assertj.core.api.Assertions.assertThat(
            jdbc.queryForObject(
                "SELECT estado FROM documento WHERE codigo = ?", String.class, firmado))
        .isEqualTo("ANULADO");
    org.assertj.core.api.Assertions.assertThat(
            jdbc.queryForObject(
                "SELECT estado FROM documento WHERE codigo = ?", String.class, pendiente))
        .isEqualTo("FIRMADO");
  }
}
