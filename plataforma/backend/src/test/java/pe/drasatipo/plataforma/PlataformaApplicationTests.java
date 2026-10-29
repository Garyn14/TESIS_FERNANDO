package pe.drasatipo.plataforma;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class PlataformaApplicationTests {

  @Autowired MockMvc mvc;

  @Test
  void saludRespondeSinAutenticacion() throws Exception {
    mvc.perform(get("/api/salud"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("ok"));
  }

  @Test
  void lasDemasRutasExigenAutenticacion() throws Exception {
    mvc.perform(get("/api/documentos")).andExpect(status().isUnauthorized());
  }
}
