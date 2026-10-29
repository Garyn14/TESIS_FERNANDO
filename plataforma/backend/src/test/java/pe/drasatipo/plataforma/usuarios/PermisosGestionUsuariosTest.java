package pe.drasatipo.plataforma.usuarios;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU01 y HU02 (DRA-12, DRA-13), RF04: solo quien tiene USUARIOS_GESTIONAR gestiona cuentas. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class PermisosGestionUsuariosTest {

  private static final String CUENTA_NUEVA =
      """
      {"nombreUsuario": "intruso", "nombreCompleto": "Intruso", "rol": "ADMINISTRADOR",
       "contrasenaTemporal": "Clave2026!"}
      """;
  private static final String EDICION = "{\"nombreCompleto\": \"Intruso\", \"rol\": \"DIRECTOR\"}";

  @Autowired MockMvc mvc;

  private static List<RequestBuilder> rutas() {
    return List.of(
        get("/api/usuarios"),
        get("/api/roles"),
        post("/api/usuarios")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(CUENTA_NUEVA),
        put("/api/usuarios/1")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(EDICION),
        post("/api/usuarios/1/desactivar").with(csrf()),
        post("/api/usuarios/1/reactivar").with(csrf()));
  }

  @Test
  void sinSesionResponde401() throws Exception {
    for (RequestBuilder ruta : rutas()) {
      mvc.perform(ruta).andExpect(status().isUnauthorized());
    }
  }

  @Test
  @WithMockUser(
      username = "director",
      authorities = {"DOCUMENTO_FIRMAR", "CUENTA_PROPIA"})
  void otroRolResponde403() throws Exception {
    for (RequestBuilder ruta : rutas()) {
      mvc.perform(ruta).andExpect(status().isForbidden());
    }
  }

  @Test
  @WithMockUser(username = "admin", authorities = "USUARIOS_GESTIONAR")
  void noExisteNingunaRutaParaEliminarCuentas() throws Exception {
    mvc.perform(delete("/api/usuarios/1").with(csrf())).andExpect(status().isMethodNotAllowed());
  }
}
