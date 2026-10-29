package pe.drasatipo.plataforma.billeteras;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
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
import org.web3j.crypto.Keys;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU06 (DRA-17): billetera del director (RF07) y rol de firmante (RF08), con sesiones reales. */
@SpringBootTest(
    properties = "plataforma.blockchain.contrato=0x00000000000000000000000000000000000000aa")
@AutoConfigureMockMvc
@Import({ContenedoresDePrueba.class, ContratoFalso.Configuracion.class})
class BilleterasTest {

  private static final String CLAVE = "Clave2026!";
  private static final AtomicInteger secuencia = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;
  @Autowired ContratoFalso contrato;

  MockHttpSession admin;

  /** Dirección nueva y única, en minúsculas. */
  private static String direccionNueva() {
    return "0x%040x".formatted(0xD1EC70L + secuencia.incrementAndGet());
  }

  private long cuenta(String rol) {
    String usuario = "billetera" + secuencia.incrementAndGet();
    jdbc.update(
        """
        INSERT INTO usuario (nombre_usuario, nombre_completo, contrasena_hash, rol_id)
        SELECT ?, ?, ?, id FROM rol WHERE codigo = ?
        """,
        usuario,
        "Persona " + usuario,
        codificador.encode(CLAVE),
        rol);
    return jdbc.queryForObject(
        "SELECT id FROM usuario WHERE nombre_usuario = ?", Long.class, usuario);
  }

  private MockHttpSession sesionDe(long id) throws Exception {
    String usuario =
        jdbc.queryForObject("SELECT nombre_usuario FROM usuario WHERE id = ?", String.class, id);
    return (MockHttpSession)
        mvc.perform(
                post("/api/sesion")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"nombreUsuario\": \"%s\", \"contrasena\": \"%s\"}"
                            .formatted(usuario, CLAVE)))
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession();
  }

  private ResultActions registrar(long id, String direccion) throws Exception {
    return mvc.perform(
        put("/api/billeteras/" + id)
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"direccion\": \"%s\"}".formatted(direccion)));
  }

  private ResultActions confirmar(long id, String transaccion) throws Exception {
    return mvc.perform(
        post("/api/billeteras/%d/firmante".formatted(id))
            .with(csrf())
            .session(admin)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"transaccion\": \"%s\"}".formatted(transaccion)));
  }

  private String eventos(long id) {
    return jdbc.queryForObject(
        "SELECT string_agg(evento, ',' ORDER BY id) FROM usuario_historial WHERE usuario_id = ?",
        String.class,
        id);
  }

  @BeforeEach
  void preparar() throws Exception {
    contrato.reiniciar();
    admin = sesionDe(cuenta("ADMINISTRADOR"));
  }

  @Test
  void registraLaBilleteraConSumaDeVerificacion() throws Exception {
    long director = cuenta("DIRECTOR");
    String direccion = direccionNueva();
    registrar(director, direccion)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.billetera").value(Keys.toChecksumAddress(direccion)))
        .andExpect(jsonPath("$.firmante").value(false));
    assertThat(eventos(director)).isEqualTo("BILLETERA_REGISTRADA");
  }

  @Test
  void validaElFormatoDeLaDireccion() throws Exception {
    long director = cuenta("DIRECTOR");
    for (String mala :
        new String[] {"", "abc", "0x123", "0x" + "g".repeat(40), "0x" + "a".repeat(41)}) {
      registrar(director, mala)
          .andExpect(status().isBadRequest())
          .andExpect(
              jsonPath("$.campos.direccion")
                  .value("La dirección debe empezar con 0x y tener 40 caracteres hexadecimales."));
    }
  }

  @Test
  void detectaErroresDeTipeoConLaSumaDeVerificacion() throws Exception {
    long director = cuenta("DIRECTOR");
    String correcta = Keys.toChecksumAddress("0x52908400098527886e0f7030069857d2e4169ee7");
    // Se cambia una letra de mayúscula a minúscula: la suma de verificación ya no coincide.
    String conError = correcta.replaceFirst("E", "e");
    registrar(director, conError)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.direccion").value(org.hamcrest.Matchers.containsString("EIP-55")));
    registrar(director, correcta).andExpect(status().isOk());
  }

  @Test
  void laBilleteraNoPuedeEstarAsignadaAOtraCuenta() throws Exception {
    String direccion = direccionNueva();
    registrar(cuenta("DIRECTOR"), direccion).andExpect(status().isOk());
    registrar(cuenta("DIRECTOR"), direccion.toUpperCase().replace("0X", "0x"))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.direccion").value("Esa billetera ya está asignada a otra cuenta."));
  }

  @Test
  void soloUnaCuentaDirectorTieneBilletera() throws Exception {
    registrar(cuenta("CONSULTA_INTERNA"), direccionNueva())
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.direccion")
                .value("Solo una cuenta con rol Director puede tener billetera."));
  }

  @Test
  void unaBilleteraAdministradoraDelContratoNoPuedeSerDelDirector() throws Exception {
    String administradora = direccionNueva();
    contrato.administradores.add(administradora);
    registrar(cuenta("DIRECTOR"), administradora)
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.direccion")
                .value(org.hamcrest.Matchers.containsString("administradora del contrato")));
  }

  @Test
  void otorgarSeVerificaEnLaBlockchainYQuedaEnElHistorial() throws Exception {
    long director = cuenta("DIRECTOR");
    String direccion = Keys.toChecksumAddress(direccionNueva());
    registrar(director, direccion).andExpect(status().isOk());

    String tx = contrato.transaccion(true, direccion);
    confirmar(director, tx)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmante").value(true));
    // Repetir la confirmación no duplica el historial (RNF10).
    confirmar(director, tx).andExpect(status().isOk());

    assertThat(eventos(director)).isEqualTo("BILLETERA_REGISTRADA,FIRMANTE_OTORGADO");
    String detalle =
        jdbc.queryForObject(
            "SELECT detalle FROM usuario_historial WHERE usuario_id = ? AND evento = 'FIRMANTE_OTORGADO'",
            String.class,
            director);
    assertThat(detalle).contains(tx).contains("bloque 100");
  }

  @Test
  void revocarQuedaEnElHistorialYElEstadoSeLeeDeLaBlockchain() throws Exception {
    long director = cuenta("DIRECTOR");
    String direccion = Keys.toChecksumAddress(direccionNueva());
    registrar(director, direccion);
    confirmar(director, contrato.transaccion(true, direccion));

    confirmar(director, contrato.transaccion(false, direccion))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firmante").value(false));
    assertThat(eventos(director)).endsWith("FIRMANTE_OTORGADO,FIRMANTE_REVOCADO");
  }

  @Test
  void rechazaTransaccionesQueNoCorrespondan() throws Exception {
    long director = cuenta("DIRECTOR");
    String direccion = Keys.toChecksumAddress(direccionNueva());
    registrar(director, direccion);

    confirmar(director, "0x" + "f".repeat(64))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.transaccion")
                .value(org.hamcrest.Matchers.startsWith("La transacción no se encontró")));
    confirmar(director, contrato.transaccion(true, Keys.toChecksumAddress(direccionNueva())))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.transaccion").value("La transacción corresponde a otra billetera."));
    confirmar(director, "no-es-un-hash").andExpect(status().isBadRequest());
    confirmar(cuenta("DIRECTOR"), "0x" + "e".repeat(64))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.mensaje").value("La cuenta no tiene billetera registrada."));
  }

  @Test
  void noSeCambiaLaBilleteraMientrasSeaFirmante() throws Exception {
    long director = cuenta("DIRECTOR");
    String actual = Keys.toChecksumAddress(direccionNueva());
    registrar(director, actual);
    contrato.transaccion(true, actual);

    registrar(director, direccionNueva())
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.campos.direccion")
                .value(
                    org.hamcrest.Matchers.startsWith(
                        "La billetera actual tiene el rol de firmante")));

    contrato.transaccion(false, actual);
    registrar(director, direccionNueva()).andExpect(status().isOk());
  }

  @Test
  void listaLosDirectoresConElEstadoLeidoDeLaBlockchain() throws Exception {
    long director = cuenta("DIRECTOR");
    String direccion = Keys.toChecksumAddress(direccionNueva());
    registrar(director, direccion);
    contrato.transaccion(true, direccion);

    mvc.perform(get("/api/billeteras").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockchainDisponible").value(true))
        .andExpect(jsonPath("$.cuentas[?(@.id == %d)].firmante".formatted(director)).value(true))
        .andExpect(jsonPath("$.cuentas[?(@.rol == 'ADMINISTRADOR')]").isEmpty());
  }

  @Test
  void siLaBlockchainNoRespondeNoSeSuponeNingunEstado() throws Exception {
    long director = cuenta("DIRECTOR");
    registrar(director, direccionNueva());
    contrato.caido = true;

    mvc.perform(get("/api/billeteras").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockchainDisponible").value(false))
        .andExpect(jsonPath("$.aviso").value("No se pudo consultar la blockchain."))
        .andExpect(
            jsonPath("$.cuentas[?(@.id == %d)].firmante".formatted(director))
                .value(org.hamcrest.Matchers.contains((Object) null)));
    registrar(director, direccionNueva()).andExpect(status().isServiceUnavailable());
  }

  @Test
  void laRedSeEntregaAlFrontend() throws Exception {
    mvc.perform(get("/api/blockchain/red").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.chainId").value(20260))
        .andExpect(jsonPath("$.chainIdHex").value("0x4f24"))
        .andExpect(jsonPath("$.contrato").value("0x00000000000000000000000000000000000000aa"))
        .andExpect(
            jsonPath("$.firmanteRol").value(org.web3j.crypto.Hash.sha3String("FIRMANTE_ROLE")));
  }

  @Test
  void soloElAdministradorGestionaBilleteras() throws Exception {
    MockHttpSession director = sesionDe(cuenta("DIRECTOR"));
    mvc.perform(get("/api/billeteras").session(director)).andExpect(status().isForbidden());
    mvc.perform(
            put("/api/billeteras/1")
                .with(csrf())
                .session(director)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"direccion\": \"0x0\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/billeteras")).andExpect(status().isUnauthorized());
    // La red sí la puede consultar cualquier sesión (el director la necesitará para firmar).
    mvc.perform(get("/api/blockchain/red").session(director)).andExpect(status().isOk());
  }
}
