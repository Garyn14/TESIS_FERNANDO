package pe.drasatipo.plataforma.billeteras;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.CambioDeRol;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.blockchain.DocumentoRegistrado;
import pe.drasatipo.plataforma.blockchain.RegistroDeFirma;

/**
 * Contrato en memoria para las pruebas del backend. La integración real con Besu se prueba en la CI
 * (scripts/probar-registro-besu.ts) y en la prueba de punta a punta (plataforma/e2e).
 */
public class ContratoFalso implements ContratoRegistro {

  public final Set<String> firmantes = new HashSet<>();
  final Set<String> administradores = new HashSet<>();
  final Map<String, CambioDeRol> transacciones = new HashMap<>();

  /** Transacciones de registrarDocumentos confirmadas (HU11). */
  public final Map<String, RegistroDeFirma> firmas = new HashMap<>();

  /** Códigos registrados en el contrato. */
  public final Set<String> registrados = new HashSet<>();

  public boolean caido;

  public void reiniciar() {
    firmantes.clear();
    administradores.clear();
    transacciones.clear();
    firmas.clear();
    registrados.clear();
    caido = false;
  }

  /**
   * Simula una transacción confirmada de registrarDocumentos de la billetera indicada y aplica su
   * efecto. Cada elemento es {código, hash del PDF, HMAC del DNI}.
   */
  public String registrar(String firmante, List<String[]> documentos) {
    String hash = "0x%064x".formatted(1_000_000 + firmas.size());
    List<DocumentoRegistrado> registrados = new ArrayList<>();
    for (String[] d : documentos) {
      registrados.add(new DocumentoRegistrado(d[0], d[1], d[2], firmante));
      this.registrados.add(d[0]);
    }
    firmas.put(
        hash,
        new RegistroDeFirma(
            hash, 500 + firmas.size(), Instant.parse("2026-11-04T15:30:00Z"), registrados));
    return hash;
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

  @Override
  public Optional<RegistroDeFirma> registroDeFirmaEn(String transaccion) {
    revisar();
    return Optional.ofNullable(firmas.get(transaccion));
  }

  @Override
  public boolean estaRegistrado(String codigo) {
    revisar();
    return registrados.contains(codigo);
  }

  @TestConfiguration(proxyBeanMethods = false)
  public static class Configuracion {
    @Bean
    @Primary
    ContratoFalso contratoFalso() {
      return new ContratoFalso();
    }
  }
}
