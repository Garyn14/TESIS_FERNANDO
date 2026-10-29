package pe.drasatipo.plataforma.usuarios;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU01 (DRA-12), RF04: solo quien tiene USUARIOS_GESTIONAR gestiona cuentas. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class PermisoCrearCuentaTest {

  private static final String CUERPO =
      """
      {"nombreUsuario": "intruso", "nombreCompleto": "Intruso", "rol": "ADMINISTRADOR",
       "contrasenaTemporal": "Clave2026!"}
      """;

  @Autowired MockMvc mvc;

  @Test
  void sinSesionResponde401() throws Exception {
    mvc.perform(
            post("/api/usuarios")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(CUERPO))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(
      username = "director",
      authorities = {"DOCUMENTO_FIRMAR", "CUENTA_PROPIA"})
  void otroRolResponde403() throws Exception {
    mvc.perform(
            post("/api/usuarios")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(CUERPO))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/usuarios")).andExpect(status().isForbidden());
    mvc.perform(get("/api/roles")).andExpect(status().isForbidden());
  }
}
