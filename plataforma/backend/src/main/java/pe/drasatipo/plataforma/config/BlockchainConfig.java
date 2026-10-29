package pe.drasatipo.plataforma.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

/** Cliente de la red Besu. La conexión se abre recién en la primera llamada. */
@Configuration
public class BlockchainConfig {

  @Bean(destroyMethod = "shutdown")
  Web3j web3j(@Value("${plataforma.besu.rpc-url}") String rpcUrl) {
    return Web3j.build(new HttpService(rpcUrl));
  }
}
