package pe.drasatipo.plataforma.blockchain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

/** HU06: lectura de los eventos de rol en un recibo de transacción, sin red. */
class ContratoRegistroWeb3jTest {

  private static final String CONTRATO = "0x3fef5c0221a4cab41d49f1a0610a4205c48e8a40";
  private static final String DIRECTOR = "0x11027e00665c052211fea67178ffe0274f735544";
  private static final String ADMIN = "0x220ee3be932a2280c12e218f31265a6cc6a83d57";

  private static String tema(String direccion) {
    return "0x000000000000000000000000" + direccion.substring(2);
  }

  private static Log log(String direccionLog, String evento, String rol) {
    Log log = new Log();
    log.setAddress(direccionLog);
    log.setTopics(List.of(evento, rol, tema(DIRECTOR), tema(ADMIN)));
    return log;
  }

  private static TransactionReceipt recibo(String estado, String para, Log... logs) {
    TransactionReceipt recibo = new TransactionReceipt();
    recibo.setStatus(estado);
    recibo.setTo(para);
    recibo.setBlockNumber("0x10e4");
    recibo.setLogs(List.of(logs));
    return recibo;
  }

  @Test
  void leeUnOtorgamiento() {
    var cambio =
        ContratoRegistroWeb3j.leerCambioDeRol(
            recibo(
                "0x1",
                CONTRATO,
                log(
                    CONTRATO,
                    ContratoRegistroWeb3j.ROLE_GRANTED,
                    ContratoRegistroWeb3j.FIRMANTE_ROLE)),
            CONTRATO);
    assertThat(cambio).isPresent();
    assertThat(cambio.get().otorgado()).isTrue();
    assertThat(cambio.get().cuenta()).isEqualToIgnoringCase(DIRECTOR);
    assertThat(cambio.get().emisor()).isEqualToIgnoringCase(ADMIN);
    assertThat(cambio.get().bloque()).isEqualTo(new BigInteger("10e4", 16).longValue());
  }

  @Test
  void leeUnaRevocacion() {
    var cambio =
        ContratoRegistroWeb3j.leerCambioDeRol(
            recibo(
                "0x1",
                CONTRATO,
                log(
                    CONTRATO,
                    ContratoRegistroWeb3j.ROLE_REVOKED,
                    ContratoRegistroWeb3j.FIRMANTE_ROLE)),
            CONTRATO);
    assertThat(cambio).isPresent();
    assertThat(cambio.get().otorgado()).isFalse();
  }

  @Test
  void ignoraTransaccionesFallidasDeOtroContratoODeOtroRol() {
    Log valido =
        log(CONTRATO, ContratoRegistroWeb3j.ROLE_GRANTED, ContratoRegistroWeb3j.FIRMANTE_ROLE);
    assertThat(ContratoRegistroWeb3j.leerCambioDeRol(recibo("0x0", CONTRATO, valido), CONTRATO))
        .isEmpty();
    assertThat(ContratoRegistroWeb3j.leerCambioDeRol(recibo("0x1", ADMIN, valido), CONTRATO))
        .isEmpty();
    Log deOtroContrato =
        log(ADMIN, ContratoRegistroWeb3j.ROLE_GRANTED, ContratoRegistroWeb3j.FIRMANTE_ROLE);
    assertThat(
            ContratoRegistroWeb3j.leerCambioDeRol(
                recibo("0x1", CONTRATO, deOtroContrato), CONTRATO))
        .isEmpty();
    Log deOtroRol = log(CONTRATO, ContratoRegistroWeb3j.ROLE_GRANTED, "0x" + "0".repeat(64));
    assertThat(ContratoRegistroWeb3j.leerCambioDeRol(recibo("0x1", CONTRATO, deOtroRol), CONTRATO))
        .isEmpty();
  }

  @Test
  void elIdentificadorDelRolEsElDelContrato() {
    // ethers.id("FIRMANTE_ROLE"), calculado en plataforma/contracts: Java y Solidity coinciden.
    assertThat(ContratoRegistroWeb3j.FIRMANTE_ROLE)
        .isEqualTo("0x4647ec771677de1994885c32570d9834500414e0ead629825e02079c48f77991");
  }
}
