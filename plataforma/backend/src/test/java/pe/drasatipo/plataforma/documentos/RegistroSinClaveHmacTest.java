package pe.drasatipo.plataforma.documentos;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.expedienteNuevo;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.trabajo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU08 (RF17, RNF03): sin la clave del HMAC configurada no se registra ningún documento. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class RegistroSinClaveHmacTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  @Test
  void sinClaveNoRegistraPeroSiMuestraLaVistaPrevia() throws Exception {
    MockHttpSession sesion =
        RegistroSolicitudDePartePrueba.sesion(
            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
    enviar(mvc, sesion, "/api/documentos/vista-previa", trabajo(expedienteNuevo()))
        .andExpect(status().isOk());
    enviar(mvc, sesion, "/api/documentos", trabajo(expedienteNuevo()))
        .andExpect(status().isServiceUnavailable())
        .andExpect(
            jsonPath("$.mensaje")
                .value(org.hamcrest.Matchers.startsWith("Falta configurar la clave")));
  }
}
