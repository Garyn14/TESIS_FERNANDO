package pe.drasatipo.plataforma.blockchain;

import java.math.BigInteger;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.Utils;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Keys;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

/** {@link ContratoRegistro} sobre la red Besu con web3j (ADR-001). */
@Component
public class ContratoRegistroWeb3j implements ContratoRegistro {

  /** keccak256("FIRMANTE_ROLE"), igual que en RegistroDocumentos.sol. */
  public static final String FIRMANTE_ROLE = Hash.sha3String("FIRMANTE_ROLE");

  private static final List<TypeReference<?>> TEMAS_DE_ROL =
      List.of(
          new TypeReference<Bytes32>(true) {},
          new TypeReference<Address>(true) {},
          new TypeReference<Address>(true) {});
  static final String ROLE_GRANTED = EventEncoder.encode(new Event("RoleGranted", TEMAS_DE_ROL));
  static final String ROLE_REVOKED = EventEncoder.encode(new Event("RoleRevoked", TEMAS_DE_ROL));

  /** Datos no indexados del evento DocumentoRegistrado: código, hash del PDF y HMAC del DNI. */
  static final List<TypeReference<Type>> DATOS_DEL_REGISTRO =
      Utils.convert(
          List.of(
              new TypeReference<Utf8String>() {},
              new TypeReference<Bytes32>() {},
              new TypeReference<Bytes32>() {}));

  static final String DOCUMENTO_REGISTRADO =
      EventEncoder.encode(
          new Event(
              "DocumentoRegistrado",
              List.of(
                  new TypeReference<Bytes32>(true) {},
                  new TypeReference<Utf8String>() {},
                  new TypeReference<Bytes32>() {},
                  new TypeReference<Bytes32>() {},
                  new TypeReference<Address>(true) {})));

  private final Web3j web3j;
  private final RedBlockchainProperties red;

  public ContratoRegistroWeb3j(Web3j web3j, RedBlockchainProperties red) {
    this.web3j = web3j;
    this.red = red;
  }

  @Override
  public boolean esFirmante(String billetera) {
    return consultarBooleano("esFirmante", billetera);
  }

  @Override
  public boolean esAdministrador(String billetera) {
    return consultarBooleano("esAdministrador", billetera);
  }

  @Override
  public Optional<CambioDeRol> cambioDeRolEn(String transaccion) {
    String contrato = contrato();
    try {
      return web3j
          .ethGetTransactionReceipt(transaccion)
          .send()
          .getTransactionReceipt()
          .flatMap(recibo -> leerCambioDeRol(recibo, contrato));
    } catch (Exception e) {
      throw noDisponible(e);
    }
  }

  @Override
  public Optional<RegistroDeFirma> registroDeFirmaEn(String transaccion) {
    String contrato = contrato();
    try {
      Optional<TransactionReceipt> recibo =
          web3j.ethGetTransactionReceipt(transaccion).send().getTransactionReceipt();
      if (recibo.isEmpty()) {
        return Optional.empty();
      }
      List<DocumentoRegistrado> documentos = leerRegistros(recibo.get(), contrato);
      if (documentos.isEmpty()) {
        return Optional.empty();
      }
      long bloque = recibo.get().getBlockNumber().longValueExact();
      long segundos =
          web3j
              .ethGetBlockByNumber(DefaultBlockParameter.valueOf(BigInteger.valueOf(bloque)), false)
              .send()
              .getBlock()
              .getTimestamp()
              .longValueExact();
      return Optional.of(
          new RegistroDeFirma(transaccion, bloque, Instant.ofEpochSecond(segundos), documentos));
    } catch (Exception e) {
      throw noDisponible(e);
    }
  }

  /** Lee los eventos DocumentoRegistrado de un recibo confirmado del contrato. */
  static List<DocumentoRegistrado> leerRegistros(TransactionReceipt recibo, String contrato) {
    if (!recibo.isStatusOK() || !contrato.equalsIgnoreCase(recibo.getTo())) {
      return List.of();
    }
    List<DocumentoRegistrado> documentos = new ArrayList<>();
    for (Log log : recibo.getLogs()) {
      List<String> temas = log.getTopics();
      if (!contrato.equalsIgnoreCase(log.getAddress())
          || temas.size() != 3
          || !DOCUMENTO_REGISTRADO.equalsIgnoreCase(temas.get(0))) {
        continue;
      }
      @SuppressWarnings("rawtypes")
      List<Type> datos = FunctionReturnDecoder.decode(log.getData(), DATOS_DEL_REGISTRO);
      documentos.add(
          new DocumentoRegistrado(
              (String) datos.get(0).getValue(),
              HexFormat.of().formatHex((byte[]) datos.get(1).getValue()),
              HexFormat.of().formatHex((byte[]) datos.get(2).getValue()),
              direccionDeTema(temas.get(2))));
    }
    return documentos;
  }

  @Override
  public boolean estaRegistrado(String codigo) {
    Function llamada =
        new Function(
            "consultar",
            List.of(new Utf8String(codigo)),
            List.of(
                new TypeReference<Bool>() {},
                new TypeReference<Bytes32>() {},
                new TypeReference<Bytes32>() {},
                new TypeReference<Address>() {},
                new TypeReference<Uint64>() {}));
    return ((Bool) llamar(llamada).get(0)).getValue();
  }

  /** Busca en el recibo el evento RoleGranted o RoleRevoked del rol de firmante. */
  static Optional<CambioDeRol> leerCambioDeRol(TransactionReceipt recibo, String contrato) {
    if (!recibo.isStatusOK() || !contrato.equalsIgnoreCase(recibo.getTo())) {
      return Optional.empty();
    }
    for (Log log : recibo.getLogs()) {
      List<String> temas = log.getTopics();
      if (!contrato.equalsIgnoreCase(log.getAddress())
          || temas.size() != 4
          || !FIRMANTE_ROLE.equalsIgnoreCase(temas.get(1))) {
        continue;
      }
      boolean otorgado = ROLE_GRANTED.equalsIgnoreCase(temas.get(0));
      if (otorgado || ROLE_REVOKED.equalsIgnoreCase(temas.get(0))) {
        return Optional.of(
            new CambioDeRol(
                otorgado,
                direccionDeTema(temas.get(2)),
                direccionDeTema(temas.get(3)),
                recibo.getBlockNumber().longValueExact()));
      }
    }
    return Optional.empty();
  }

  /** Un tema indexado de tipo address son 32 bytes: la dirección son los últimos 20. */
  private static String direccionDeTema(String tema) {
    return Keys.toChecksumAddress("0x" + tema.substring(tema.length() - 40));
  }

  private boolean consultarBooleano(String funcion, String billetera) {
    Function llamada =
        new Function(
            funcion, List.of(new Address(billetera)), List.of(new TypeReference<Bool>() {}));
    return ((Bool) llamar(llamada).get(0)).getValue();
  }

  /** eth_call de solo lectura al contrato. */
  @SuppressWarnings("rawtypes")
  private List<Type> llamar(Function llamada) {
    try {
      EthCall respuesta =
          web3j
              .ethCall(
                  Transaction.createEthCallTransaction(
                      null, contrato(), FunctionEncoder.encode(llamada)),
                  DefaultBlockParameterName.LATEST)
              .send();
      if (respuesta.hasError() || respuesta.isReverted()) {
        throw new IllegalStateException("eth_call rechazada: " + respuesta.getRevertReason());
      }
      @SuppressWarnings("rawtypes")
      List<Type> valores =
          FunctionReturnDecoder.decode(respuesta.getValue(), llamada.getOutputParameters());
      if (valores.isEmpty()) {
        throw new IllegalStateException("El contrato no respondió en " + contrato());
      }
      return valores;
    } catch (BlockchainNoDisponibleException e) {
      throw e;
    } catch (Exception e) {
      throw noDisponible(e);
    }
  }

  private String contrato() {
    if (!red.contratoConfigurado()) {
      throw new BlockchainNoDisponibleException(
          "El contrato de la plataforma todavía no está configurado.", null);
    }
    return red.contrato();
  }

  private static BlockchainNoDisponibleException noDisponible(Exception causa) {
    return new BlockchainNoDisponibleException(
        "No se pudo consultar la blockchain. Intente nuevamente en unos minutos.", causa);
  }
}
