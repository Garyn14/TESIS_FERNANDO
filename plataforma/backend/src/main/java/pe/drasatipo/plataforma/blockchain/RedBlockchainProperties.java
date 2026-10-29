package pe.drasatipo.plataforma.blockchain;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Red Besu de la plataforma (RNF11) y contrato desplegado.
 *
 * @param chainId identificador de la red (20260)
 * @param nombre nombre de la red que se propone agregar a MetaMask
 * @param rpcPublica URL del nodo que usa la billetera del navegador
 * @param contrato dirección de RegistroDocumentos; vacía si todavía no se desplegó
 */
@ConfigurationProperties("plataforma.blockchain")
public record RedBlockchainProperties(
    long chainId, String nombre, String rpcPublica, String contrato) {

  public boolean contratoConfigurado() {
    return contrato != null && !contrato.isBlank();
  }
}
