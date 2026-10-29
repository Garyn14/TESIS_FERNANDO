package pe.drasatipo.plataforma.billeteras;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.CambioDeRol;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;

/**
 * Contrato en memoria para las pruebas del backend. La integración real con Besu se prueba en la CI
 * (scripts/probar-registro-besu.ts) y en la prueba de punta a punta (plataforma/e2e).
 */
class ContratoFalso implements ContratoRegistro {

  final Set<String> firmantes = new HashSet<>();
  final Set<String> administradores = new HashSet<>();
  final Map<String, CambioDeRol> transacciones = new HashMap<>();
  boolean caido;

  void reiniciar() {
    firmantes.clear();
    administradores.clear();
    transacciones.clear();
    caido = false;
  }

  /** Simula una transacción confirmada del Administrador y aplica su efecto. */
  String transaccion(boolean otorgar, String cuenta) {
    String hash = "0x%064x".formatted(transacciones.size() + 1);
    transacciones.put(hash, new CambioDeRol(otorgar, cuenta, "0xAdministrador", 100));
    if (otorgar) {
      firmantes.add(cuenta.toLowerCase());
    } else {
      firmantes.remove(cuenta.toLowerCase());
    }
    return hash;
  }

  private void revisar() {
    if (caido) {
      throw new BlockchainNoDisponibleException("No se pudo consultar la blockchain.", null);
    }
  }

  @Override
  public boolean esFirmante(String billetera) {
    revisar();
    return firmantes.contains(billetera.toLowerCase());
  }

  @Override
  public boolean esAdministrador(String billetera) {
    revisar();
    return administradores.contains(billetera.toLowerCase());
  }

  @Override
  public Optional<CambioDeRol> cambioDeRolEn(String transaccion) {
    revisar();
    return Optional.ofNullable(transacciones.get(transaccion));
  }

  @TestConfiguration(proxyBeanMethods = false)
  static class Configuracion {
    @Bean
    @Primary
    ContratoFalso contratoFalso() {
      return new ContratoFalso();
    }
  }
}
