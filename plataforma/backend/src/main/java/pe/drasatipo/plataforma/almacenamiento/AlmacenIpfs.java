package pe.drasatipo.plataforma.almacenamiento;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Cliente de la API HTTP de Kubo, el nodo IPFS privado (DRA-46). La API solo escucha en el
 * servidor: nunca se expone a Internet (RNF03).
 */
@Component
public class AlmacenIpfs implements AlmacenDeArchivos {

  private final RestClient cliente;

  public AlmacenIpfs(
      @Value("${plataforma.ipfs.url}") String url,
      @Value("${plataforma.ipfs.tiempo-maximo:30s}") Duration tiempoMaximo) {
    SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
    fabrica.setConnectTimeout(Duration.ofSeconds(5));
    fabrica.setReadTimeout(tiempoMaximo);
    this.cliente =
        RestClient.builder()
            .baseUrl(url.replaceAll("/+$", "") + "/api/v0")
            .requestFactory(fabrica)
            .build();
  }

  private record Agregado(@JsonProperty("Hash") String hash) {}

  @Override
  public String guardar(String nombre, byte[] contenido) {
    MultiValueMap<String, Object> partes = new LinkedMultiValueMap<>();
    partes.add(
        "file",
        new ByteArrayResource(contenido) {
          @Override
          public String getFilename() {
            return nombre;
          }
        });
    try {
      // CIDv1 (bafy…) y fijado (pin): el recolector de basura de IPFS no lo borra.
      Agregado agregado =
          cliente
              .post()
              .uri("/add?cid-version=1&raw-leaves=false&pin=true&quieter=true")
              .contentType(MediaType.MULTIPART_FORM_DATA)
              .body(partes)
              .retrieve()
              .body(Agregado.class);
      if (agregado == null || agregado.hash() == null || agregado.hash().isBlank()) {
        throw new AlmacenamientoNoDisponibleException("IPFS no devolvió el CID", null);
      }
      return agregado.hash();
    } catch (RestClientException e) {
      throw new AlmacenamientoNoDisponibleException(
          "No se pudo guardar el archivo en IPFS: " + e.getMessage(), e);
    }
  }

  @Override
  public byte[] recuperar(String cid) {
    try {
      byte[] contenido = cliente.post().uri("/cat?arg={cid}", cid).retrieve().body(byte[].class);
      return contenido == null ? new byte[0] : contenido;
    } catch (RestClientException e) {
      throw new AlmacenamientoNoDisponibleException(
          "No se pudo recuperar el archivo de IPFS: " + e.getMessage(), e);
    }
  }
}
