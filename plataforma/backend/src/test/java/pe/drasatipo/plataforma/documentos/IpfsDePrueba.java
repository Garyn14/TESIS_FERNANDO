package pe.drasatipo.plataforma.documentos;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import pe.drasatipo.plataforma.almacenamiento.AlmacenDeArchivos;
import pe.drasatipo.plataforma.almacenamiento.AlmacenIpfs;
import pe.drasatipo.plataforma.almacenamiento.AlmacenamientoNoDisponibleException;

/**
 * Nodo IPFS real (Kubo, la misma versión del nodo privado) para las pruebas de HU11 y HU17, sin
 * conexión a ninguna red. Un solo contenedor para todas las pruebas que lo usan.
 */
@TestConfiguration(proxyBeanMethods = false)
public class IpfsDePrueba {

  @SuppressWarnings("resource")
  static final GenericContainer<?> KUBO =
      new GenericContainer<>("ipfs/kubo:v0.43.1")
          .withCommand("daemon", "--offline")
          .withExposedPorts(5001)
          .waitingFor(Wait.forLogMessage(".*Daemon is ready.*", 1))
          .withStartupTimeout(Duration.ofMinutes(2));

  /** Archivos con los que el almacén simula que el nodo no responde. */
  static final Set<String> FALLAN = ConcurrentHashMap.newKeySet();

  static String apiIpfs() {
    if (!KUBO.isRunning()) {
      KUBO.start();
    }
    return "http://" + KUBO.getHost() + ":" + KUBO.getMappedPort(5001);
  }

  @Bean
  DynamicPropertyRegistrar direccionDeIpfs() {
    return propiedades -> propiedades.add("plataforma.ipfs.url", IpfsDePrueba::apiIpfs);
  }

  /** El IPFS real, salvo para los archivos marcados en {@link #FALLAN}. */
  @Bean
  @Primary
  AlmacenDeArchivos almacenConFallas(AlmacenIpfs real) {
    return new AlmacenDeArchivos() {
      @Override
      public String guardar(String nombre, byte[] contenido) {
        if (FALLAN.contains(nombre)) {
          throw new AlmacenamientoNoDisponibleException("Nodo IPFS sin respuesta", null);
        }
        return real.guardar(nombre, contenido);
      }

      @Override
      public byte[] recuperar(String cid) {
        return real.recuperar(cid);
      }
    };
  }
}
