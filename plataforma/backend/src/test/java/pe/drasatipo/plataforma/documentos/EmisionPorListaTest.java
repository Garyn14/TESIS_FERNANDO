package pe.drasatipo.plataforma.documentos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pe.drasatipo.plataforma.documentos.RegistroSolicitudDePartePrueba.enviar;

import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.drasatipo.plataforma.ContenedoresDePrueba;

/** HU09 (DRA-20): emisión por lista con plantilla Excel, validación por fila y lote. */
@SpringBootTest(properties = "plataforma.dni.clave-hmac=" + RegistroSolicitudDeParteTest.CLAVE_HMAC)
@AutoConfigureMockMvc
@Import(ContenedoresDePrueba.class)
class EmisionPorListaTest {

  private static final String EVENTO =
      """
      {"nombreEvento": "Manejo integrado de plagas en café", "fechaInicio": "2026-09-14",
       "fechaFin": "2026-09-16", "duracionHoras": "24",
       "lugar": "Local comunal de Río Negro, Satipo", "areaOrganizadora": "Área de Capacitación"}
      """;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder codificador;

  private MockHttpSession capacitacion() throws Exception {
    return RegistroSolicitudDePartePrueba.sesion(
        mvc, jdbc, codificador, "AREA_ENCARGADA", "CAPACITACION");
  }

  /** DNI de 8 dígitos distintos entre llamadas, para no chocar con otras pruebas. */
  private static String dni(int n) {
    return String.valueOf(40_000_000 + n);
  }

  private static String lote(String evento, String... filas) {
    return """
        {"tipo": "CERTIFICADO_CAPACITACION", "datos": %s, "beneficiarios": [%s]}
        """
        .formatted(evento, String.join(",", filas));
  }

  private static String fila(String nombres, String apellidos, String dni) {
    return "{\"nombres\": \"%s\", \"apellidos\": \"%s\", \"dni\": \"%s\"}"
        .formatted(nombres, apellidos, dni);
  }

  private ResultActions importar(MockHttpSession sesion, byte[] contenido) throws Exception {
    return mvc.perform(
        multipart("/api/lotes/importar")
            .file(new MockMultipartFile("archivo", "lista.xlsx", null, contenido))
            .with(csrf())
            .session(sesion));
  }

  /** Un .xlsx con encabezados y filas; el DNI de la primera fila se guarda como número. */
  private static byte[] excel(List<String> encabezados, List<List<Object>> filas) throws Exception {
    try (Workbook libro = new XSSFWorkbook();
        ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
      Sheet hoja = libro.createSheet();
      Row primera = hoja.createRow(0);
      for (int i = 0; i < encabezados.size(); i++) {
        primera.createCell(i).setCellValue(encabezados.get(i));
      }
      for (int f = 0; f < filas.size(); f++) {
        Row fila = hoja.createRow(f + 2); // deja una fila vacía en medio
        for (int c = 0; c < filas.get(f).size(); c++) {
          Object valor = filas.get(f).get(c);
          if (valor instanceof Number n) {
            fila.createCell(c).setCellValue(n.doubleValue());
          } else {
            fila.createCell(c).setCellValue((String) valor);
          }
        }
      }
      libro.write(salida);
      return salida.toByteArray();
    }
  }

  @Test
  void laPlantillaEsUnExcelConLasColumnasYElDniComoTexto() throws Exception {
    byte[] archivo =
        mvc.perform(
                get("/api/lotes/plantilla")
                    .param("tipo", "CERTIFICADO_CAPACITACION")
                    .session(capacitacion()))
            .andExpect(status().isOk())
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        "attachment; filename=\"plantilla-beneficiarios.xlsx\""))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    try (Workbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
      Row encabezados = libro.getSheetAt(0).getRow(0);
      assertThat(
              IntStream.range(0, 3)
                  .mapToObj(i -> encabezados.getCell(i).getStringCellValue())
                  .toList())
          .containsExactly("Nombres", "Apellidos", "DNI");
      assertThat(libro.getSheetAt(0).getColumnStyle(2).getDataFormatString()).isEqualTo("@");
    }
  }

  @Test
  void laPlantillaSoloSeDescargaParaUnTipoDeOficioDelArea() throws Exception {
    mvc.perform(
            get("/api/lotes/plantilla")
                .param("tipo", "CERTIFICADO_TRABAJO")
                .session(capacitacion()))
        .andExpect(status().isForbidden());
  }

  @Test
  void importaLasFilasDelExcelIgnorandoLasVacias() throws Exception {
    byte[] archivo =
        excel(
            List.of(" dni", "Nombres", "APELLIDOS"),
            List.of(
                List.of(45218736, "Juan", "Ccori Pari"),
                List.of("04419823", "Wilber", "Quispe Casancho")));
    importar(capacitacion(), archivo)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].nombres").value("Juan"))
        .andExpect(jsonPath("$[0].dni").value("45218736"))
        .andExpect(jsonPath("$[1].dni").value("04419823"));
  }

  @Test
  void rechazaUnArchivoQueNoEsLaPlantilla() throws Exception {
    MockHttpSession sesion = capacitacion();
    importar(sesion, "Nombres,Apellidos,DNI\nJuan,Ccori,45218736".getBytes())
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.archivo")
                .value(
                    "El archivo no es una plantilla Excel (.xlsx). Use la plantilla descargada."));
    importar(sesion, excel(List.of("Nombre", "DNI"), List.of(List.of("Juan", "45218736"))))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.archivo")
                .value(
                    "El archivo no tiene las columnas Nombres, Apellidos y DNI de la plantilla."));
    List<List<Object>> muchas =
        IntStream.range(0, 301).mapToObj(i -> List.<Object>of("Ana", "Soto", dni(i))).toList();
    importar(sesion, excel(List.of("Nombres", "Apellidos", "DNI"), muchas))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.archivo")
                .value(
                    "El archivo tiene más de 300 beneficiarios. Divida la lista en varios lotes."));
  }

  @Test
  void laVistaPreviaMuestraUnEjemploYElResumenDelLote() throws Exception {
    enviar(
            mvc,
            capacitacion(),
            "/api/lotes/vista-previa",
            lote(
                EVENTO,
                fila("Juan", "Ccori Pari", "45218736"),
                fila("María Elena", "Rojas Soto", "47390125")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cantidad").value(2))
        .andExpect(jsonPath("$.ejemplo.nombres").value("Juan"))
        .andExpect(jsonPath("$.ejemplo.titulo").value("CERTIFICADO"))
        .andExpect(
            jsonPath("$.ejemplo.texto")
                .value(
                    "Por haber participado en el taller de capacitación 'Manejo integrado de"
                        + " plagas en café', realizado del 14 al 16 de setiembre de 2026 en Local"
                        + " comunal de Río Negro, Satipo, con una duración de 24 horas."))
        .andExpect(jsonPath("$.beneficiarios[1]").value("María Elena Rojas Soto"))
        .andExpect(jsonPath("$.periodo").value("del 14 al 16 de setiembre de 2026"));
  }

  @Test
  void cadaFilaSeValidaYUnDniRepetidoSeSenalaEnLasDos() throws Exception {
    enviar(
            mvc,
            capacitacion(),
            "/api/lotes/vista-previa",
            lote(
                EVENTO,
                fila("Juan", "Ccori Pari", "45218736"),
                fila("", "Rojas", "4739012"),
                fila("Pedro", "Huaman Inga", "45218736")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['beneficiarios[1].nombres']").value("Ingrese los nombres."))
        .andExpect(
            jsonPath("$.campos['beneficiarios[1].dni']").value("El DNI debe tener 8 dígitos."))
        .andExpect(
            jsonPath("$.campos['beneficiarios[2].dni']").value("El DNI se repite en la fila 1."))
        .andExpect(
            jsonPath("$.campos['beneficiarios[0].dni']").value("El DNI se repite en la fila 3."));
  }

  @Test
  void validaLosDatosDelEventoYExigeBeneficiarios() throws Exception {
    enviar(
            mvc,
            capacitacion(),
            "/api/lotes",
            lote(
                """
                {"nombreEvento": "", "fechaInicio": "2026-09-16", "fechaFin": "2026-09-14",
                 "duracionHoras": "0", "lugar": "Satipo", "areaOrganizadora": "Capacitación"}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['datos.nombreEvento']").value("Complete este campo."))
        .andExpect(
            jsonPath("$.campos['datos.fechaFin']")
                .value("La fecha de fin no puede ser anterior a la de inicio."))
        .andExpect(
            jsonPath("$.campos['datos.duracionHoras']")
                .value("Ingrese un número entero de 1 a 1000."))
        .andExpect(jsonPath("$.campos.beneficiarios").value("Agregue al menos un beneficiario."));
  }

  @Test
  void alEnviarCreaElLoteYUnDocumentoPendientePorBeneficiario() throws Exception {
    MockHttpSession sesion = capacitacion();
    int anio = LocalDate.now().getYear();
    String json =
        enviar(
                mvc,
                sesion,
                "/api/lotes",
                lote(
                    EVENTO,
                    fila("Juan", "Ccori Pari", dni(1001)),
                    fila("María Elena", "Rojas Soto", dni(1002)),
                    fila("Pedro", "Huaman Inga", dni(1003))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.documentos.length()").value(3))
            .andExpect(jsonPath("$.documentos[0].nombres").value("Juan"))
            .andExpect(
                jsonPath("$.documentos[*].estado")
                    .value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("PENDIENTE"))))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    String numero = JsonPath.read(json, "$.numero");
    assertThat(numero).matches(anio + "-\\d{3}");
    List<String> codigos = JsonPath.read(json, "$.documentos[*].codigo");
    assertThat(codigos).doesNotHaveDuplicates();

    List<String> hmacs =
        jdbc.queryForList(
            "SELECT d.dni_hmac FROM documento d JOIN lote l ON l.id = d.lote_id"
                + " WHERE l.numero = ? AND d.origen = 'OFICIO' AND d.numero_expediente IS NULL",
            String.class,
            numero);
    assertThat(hmacs).hasSize(3).doesNotHaveDuplicates().allMatch(h -> h.matches("[0-9a-f]{64}"));
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM documento_historial h JOIN documento d ON d.id ="
                    + " h.documento_id JOIN lote l ON l.id = d.lote_id WHERE l.numero = ?",
                Integer.class,
                numero))
        .isEqualTo(3);

    // El siguiente lote recibe el número siguiente.
    String siguiente =
        JsonPath.read(
            enviar(mvc, sesion, "/api/lotes", lote(EVENTO, fila("Ana", "Soto", dni(1004))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8),
            "$.numero");
    assertThat(Integer.parseInt(siguiente.substring(5)))
        .isEqualTo(Integer.parseInt(numero.substring(5)) + 1);
  }

  @Test
  void misDocumentosMuestraElLoteEnUnaFilaYSuDetalleSoloEnSuArea() throws Exception {
    MockHttpSession sesion = capacitacion();
    String numero =
        JsonPath.read(
            enviar(
                    mvc,
                    sesion,
                    "/api/lotes",
                    lote(
                        EVENTO,
                        fila("Juan", "Ccori Pari", dni(2001)),
                        fila("Rosa Luz", "Chuquimantari Pérez", dni(2002))))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8),
            "$.numero");

    mvc.perform(get("/api/documentos").session(sesion))
        .andExpect(jsonPath("$[?(@.lote == '%s')].cantidad".formatted(numero)).value(2))
        .andExpect(
            jsonPath("$[?(@.lote == '%s')].beneficiario".formatted(numero))
                .value("2 beneficiarios"));

    mvc.perform(get("/api/lotes/" + numero).session(sesion))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.datos.nombreEvento").value("Manejo integrado de plagas en café"))
        .andExpect(jsonPath("$.ejemplo.nombres").value("Juan"))
        .andExpect(jsonPath("$.documentos[1].apellidos").value("Chuquimantari Pérez"));

    String codigo =
        JsonPath.read(
            mvc.perform(get("/api/lotes/" + numero).session(sesion))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8),
            "$.documentos[0].codigo");
    mvc.perform(get("/api/documentos/" + codigo).session(sesion))
        .andExpect(jsonPath("$.lote").value(numero))
        .andExpect(jsonPath("$.numeroExpediente").doesNotExist());

    MockHttpSession otra =
        RegistroSolicitudDePartePrueba.sesion(
            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
    mvc.perform(get("/api/lotes/" + numero).session(otra))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.mensaje").value("Este lote no pertenece a su área."));
  }

  @Test
  void elReconocimientoUsaSuPlantillaYUnTipoASolicitudDeParteNoSeRegistraPorLista()
      throws Exception {
    MockHttpSession sesion = capacitacion();
    enviar(
            mvc,
            sesion,
            "/api/lotes/vista-previa",
            """
            {"tipo": "CERTIFICADO_RECONOCIMIENTO",
             "datos": {"motivo": "su destacada labor como promotora agraria",
                       "nombreEvento": "Día del Campesino 2026", "fecha": "2026-06-24",
                       "lugar": "Plaza de Armas de Satipo", "areaOrganizadora": "Capacitación"},
             "beneficiarios": [{"nombres": "María Elena", "apellidos": "Rojas Soto",
                                "dni": "47390125"}]}
            """)
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.ejemplo.texto")
                .value(
                    "En reconocimiento a su destacada labor como promotora agraria, en el marco"
                        + " de 'Día del Campesino 2026', realizado el 24 de junio de 2026 en"
                        + " Plaza de Armas de Satipo."));

    MockHttpSession administracion =
        RegistroSolicitudDePartePrueba.sesion(
            mvc, jdbc, codificador, "AREA_ENCARGADA", "ADMINISTRACION");
    enviar(
            mvc,
            administracion,
            "/api/lotes",
            lote(EVENTO, fila("Juan", "Ccori", "45218736"))
                .replace("CERTIFICADO_CAPACITACION", "CERTIFICADO_TRABAJO"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void permisosDeLasRutas() throws Exception {
    mvc.perform(get("/api/lotes/2026-001")).andExpect(status().isUnauthorized());
    for (String rol : new String[] {"ADMINISTRADOR", "DIRECTOR", "CONSULTA_INTERNA"}) {
      MockHttpSession otro =
          RegistroSolicitudDePartePrueba.sesion(mvc, jdbc, codificador, rol, null);
      mvc.perform(get("/api/lotes/2026-001").session(otro)).andExpect(status().isForbidden());
      mvc.perform(
              get("/api/lotes/plantilla").param("tipo", "CERTIFICADO_CAPACITACION").session(otro))
          .andExpect(status().isForbidden());
      enviar(mvc, otro, "/api/lotes", lote(EVENTO, fila("Juan", "Ccori", "45218736")))
          .andExpect(status().isForbidden());
    }
  }

  @Test
  void elPeriodoSeEscribeEnLetras() {
    assertThat(PlantillasDeDocumento.periodo("2026-09-28", "2026-10-02"))
        .isEqualTo("del 28 de setiembre al 2 de octubre de 2026");
    assertThat(PlantillasDeDocumento.periodo("2025-12-30", "2026-01-02"))
        .isEqualTo("del 30 de diciembre de 2025 al 2 de enero de 2026");
    assertThat(PlantillasDeDocumento.periodo("2026-06-24", "2026-06-24"))
        .isEqualTo("el 24 de junio de 2026");
  }
}
