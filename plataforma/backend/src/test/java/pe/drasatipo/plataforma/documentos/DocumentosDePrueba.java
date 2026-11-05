package pe.drasatipo.plataforma.documentos;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.billeteras.ContratoFalso;

/**
 * Ayudas para las pruebas que necesitan documentos ya registrados, revisados, firmados o reemitidos
 * por la API, como lo hacen las pantallas (HU08–HU11, HU30).
 */
public final class DocumentosDePrueba {

  public static final String CLAVE_HMAC = RegistroSolicitudDeParteTest.CLAVE_HMAC;
  public static final String MOTIVO_REEMISION = "El apellido del beneficiario estaba mal escrito";

  public record Director(MockHttpSession sesion, String billetera) {}

  private final MockMvc mvc;
  private final JdbcTemplate jdbc;
  private final PasswordEncoder codificador;
  private final ContratoFalso contrato;

  public DocumentosDePrueba(
      MockMvc mvc, JdbcTemplate jdbc, PasswordEncoder codificador, ContratoFalso contrato) {
    this.mvc = mvc;
    this.jdbc = jdbc;
    this.codificador = codificador;
    this.contrato = contrato;
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

  public Director director() throws Exception {
    var d = PreparacionDeFirmaTest.directorFirmante(mvc, jdbc, codificador, contrato);
    return new Director(d.sesion(), d.billetera());
  }

  public MockHttpSession area(String area) throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, "AREA_ENCARGADA", area);
  }

  /** Un Certificado de Trabajo de Lucía Paredes Quinto, enviado y revisado por el Director. */
  public String revisado(Director director, MockHttpSession area) throws Exception {
    String codigo =
        JsonPath.read(
            cuerpo(
                RegistroSolicitudDePartePrueba.enviar(
                        mvc,
                        area,
                        "/api/documentos",
                        RegistroSolicitudDePartePrueba.trabajo(
                            RegistroSolicitudDePartePrueba.expedienteNuevo()))
                    .andExpect(status().isCreated())),
            "$.codigo");
    revisar(director, codigo);
    return codigo;
  }

  public void revisar(Director director, String codigo) throws Exception {
    mvc.perform(post("/api/revision/documentos/" + codigo).with(csrf()).session(director.sesion()))
        .andExpect(status().isOk());
  }

  /** Prepara y registra los documentos con la billetera del Director, como la pantalla. */
  public String firmar(Director director, String... codigos) throws Exception {
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
    return reemisiones.isEmpty()
        ? contrato.registrar(director.billetera(), nuevos)
        : contrato.reemitir(director.billetera(), reemisiones);
  }

  public void confirmar(Director director, String tx, int firmados) throws Exception {
    json(director.sesion(), "/api/firma/confirmacion", "{\"transaccion\": \"%s\"}".formatted(tx))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmados.length()").value(firmados));
  }

  public String firmado(Director director, MockHttpSession area) throws Exception {
    String codigo = revisado(director, area);
    confirmar(director, firmar(director, codigo), 1);
    return codigo;
  }

  /** HU30: la reemisión de un firmado con los apellidos y el cargo corregidos. */
  public String reemitido(MockHttpSession area, String codigo) throws Exception {
    return JsonPath.read(
        cuerpo(
            json(
                    area,
                    "/api/documentos/%s/reemision".formatted(codigo),
                    """
                    {"nombres": "Lucía", "apellidos": "Paredes Quintana", "dni": "45829364",
                     "datos": {"cargo": "secretaria", "fechaInicio": "2025-01-02",
                               "fechaFin": "2026-09-30"},
                     "motivo": "%s"}
                    """
                        .formatted(MOTIVO_REEMISION))
                .andExpect(status().isCreated())),
        "$.codigo");
  }
}
