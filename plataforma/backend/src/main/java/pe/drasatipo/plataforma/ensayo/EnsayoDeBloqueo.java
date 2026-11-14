package pe.drasatipo.plataforma.ensayo;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * DRA-79, PR DE ENSAYO (no se fusiona): una vulnerabilidad sembrada a propósito, para comprobar que
 * la revisión estática la bloquea. Arma el SQL con lo que escribe el usuario (inyección de SQL).
 */
@RestController
class EnsayoDeBloqueo {

  private final JdbcTemplate jdbc;

  EnsayoDeBloqueo(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/api/ensayo-de-bloqueo")
  List<Map<String, Object>> buscar(@RequestParam String dni) {
    return jdbc.queryForList("SELECT codigo FROM documento WHERE dni = '" + dni + "'");
  }
}
