package pe.drasatipo.plataforma.salud;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SaludController {

  private final String version;

  public SaludController(@Value("${plataforma.version}") String version) {
    this.version = version;
  }

  @GetMapping("/api/salud")
  public Map<String, String> salud() {
    return Map.of("estado", "ok", "version", version);
  }
}
