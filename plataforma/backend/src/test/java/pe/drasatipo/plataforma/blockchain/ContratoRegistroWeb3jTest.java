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

  // HU11: lectura de los documentos registrados en un recibo de registrarDocumentos.
  private static Log registro(String direccionLog, String codigo, String hash, String hmac) {
    Log log = new Log();
    log.setAddress(direccionLog);
    log.setTopics(
        List.of(
            ContratoRegistroWeb3j.DOCUMENTO_REGISTRADO,
            org.web3j.crypto.Hash.sha3String(codigo),
            tema(DIRECTOR)));
    log.setData(
        "0x"
            + org.web3j.abi.FunctionEncoder.encodeConstructor(
                List.of(
                    new org.web3j.abi.datatypes.Utf8String(codigo),
                    new org.web3j.abi.datatypes.generated.Bytes32(
                        java.util.HexFormat.of().parseHex(hash)),
                    new org.web3j.abi.datatypes.generated.Bytes32(
                        java.util.HexFormat.of().parseHex(hmac)))));
    return log;
  }

  @Test
  void elEventoDeRegistroTieneLaFirmaDelContrato() {
    assertThat(ContratoRegistroWeb3j.DOCUMENTO_REGISTRADO)
        .isEqualTo(
            org.web3j.crypto.Hash.sha3String(
                "DocumentoRegistrado(bytes32,string,bytes32,bytes32,address)"));
  }

  @Test
  void leeLosDocumentosRegistradosDeUnRecibo() {
    String hash = "ab".repeat(32);
    String hmac = "cd".repeat(32);
    var documentos =
        ContratoRegistroWeb3j.leerRegistros(
            recibo(
                "0x1",
                CONTRATO,
                registro(CONTRATO, "DRA-2026-F8R2MA", hash, hmac),
                // Un evento de otro contrato no cuenta.
                registro(ADMIN, "DRA-2026-ZZZZZZ", hash, hmac),
                registro(CONTRATO, "DRA-2026-K7M4PX", hmac, hash)),
            CONTRATO);
    assertThat(documentos).hasSize(2);
    assertThat(documentos.get(0).codigo()).isEqualTo("DRA-2026-F8R2MA");
    assertThat(documentos.get(0).hashPdf()).isEqualTo(hash);
    assertThat(documentos.get(0).dniHmac()).isEqualTo(hmac);
    assertThat(documentos.get(0).firmante()).isEqualToIgnoringCase(DIRECTOR);
    assertThat(documentos.get(1).codigo()).isEqualTo("DRA-2026-K7M4PX");
  }

  @Test
  void unReciboFallidoODeOtroContratoNoRegistraNada() {
    Log log = registro(CONTRATO, "DRA-2026-F8R2MA", "ab".repeat(32), "cd".repeat(32));
    assertThat(ContratoRegistroWeb3j.leerRegistros(recibo("0x0", CONTRATO, log), CONTRATO))
        .isEmpty();
    assertThat(ContratoRegistroWeb3j.leerRegistros(recibo("0x1", ADMIN, log), CONTRATO)).isEmpty();
  }

  // HU29: lectura del evento DocumentoAnulado.
  @Test
  void elEventoDeAnulacionTieneLaFirmaDelContratoYSeLee() {
    assertThat(ContratoRegistroWeb3j.DOCUMENTO_ANULADO)
        .isEqualTo(org.web3j.crypto.Hash.sha3String("DocumentoAnulado(bytes32,string,address)"));
    Log log = new Log();
    log.setAddress(CONTRATO);
    log.setTopics(
        List.of(
            ContratoRegistroWeb3j.DOCUMENTO_ANULADO,
            org.web3j.crypto.Hash.sha3String("DRA-2026-Q7W3RT"),
            tema(DIRECTOR)));
    log.setData(
        "0x"
            + org.web3j.abi.FunctionEncoder.encodeConstructor(
                List.of(new org.web3j.abi.datatypes.Utf8String("DRA-2026-Q7W3RT"))));
    var anulacion = ContratoRegistroWeb3j.leerAnulacion(log, CONTRATO);
    assertThat(anulacion).isPresent();
    assertThat(anulacion.get()[0]).isEqualTo("DRA-2026-Q7W3RT");
    assertThat(anulacion.get()[1]).isEqualToIgnoringCase(DIRECTOR);
    // Un registro (DocumentoRegistrado) no se lee como anulación.
    assertThat(
            ContratoRegistroWeb3j.leerAnulacion(
                registro(CONTRATO, "DRA-2026-Q7W3RT", "ab".repeat(32), "cd".repeat(32)), CONTRATO))
        .isEmpty();
  }
}
