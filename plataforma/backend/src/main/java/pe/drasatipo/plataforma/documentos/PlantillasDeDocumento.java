package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Campos y texto de cada tipo de documento a solicitud de parte (HU08, RF18). Los textos vienen del
 * prototipo. PENDIENTE: validarlos con el Product Owner con los ejemplos reales de cada documento.
 */
public final class PlantillasDeDocumento {

  /** Campos del formulario y cómo se arma el texto del documento con sus valores. */
  public record Plantilla(
      List<CampoPlantilla> campos, Function<Map<String, String>, String> texto) {}

  private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private static final Map<String, Plantilla> PLANTILLAS =
      Map.of(
          "CONSTANCIA_PRODUCTOR_ACTIVO",
          new Plantilla(
              List.of(
                  CampoPlantilla.texto("cultivo", "Cultivo principal", "Ej.: café"),
                  CampoPlantilla.texto("sector", "Sector o comunidad", "Ej.: Alto Pichanaki")),
              d ->
                  ("Por encontrarse registrado como productor activo en el ámbito de la Agencia"
                          + " Agraria Satipo, dedicado al cultivo de %s en el sector %s.")
                      .formatted(d.get("cultivo"), d.get("sector"))),
          "CERTIFICADO_PRACTICAS",
          new Plantilla(
              List.of(
                  CampoPlantilla.opcion(
                      "modalidad", "Modalidad", List.of("preprofesionales", "profesionales")),
                  CampoPlantilla.texto(
                      "areaPracticas",
                      "Área donde realizó las prácticas",
                      "Ej.: Área de Administración"),
                  CampoPlantilla.fecha("fechaInicio", "Fecha de inicio"),
                  CampoPlantilla.fecha("fechaFin", "Fecha de fin")),
              d ->
                  ("Por haber realizado sus prácticas %s en el %s de la Agencia Agraria Satipo,"
                          + " del %s al %s, demostrando responsabilidad y compromiso.")
                      .formatted(
                          d.get("modalidad"),
                          d.get("areaPracticas"),
                          fecha(d.get("fechaInicio")),
                          fecha(d.get("fechaFin")))),
          "CERTIFICADO_TRABAJO",
          new Plantilla(
              List.of(
                  CampoPlantilla.texto("cargo", "Cargo", "Ej.: asistente administrativa"),
                  CampoPlantilla.fecha("fechaInicio", "Fecha de inicio"),
                  CampoPlantilla.fecha("fechaFin", "Fecha de fin")),
              d ->
                  ("Por haber laborado en la Agencia Agraria Satipo como %s, del %s al %s,"
                          + " demostrando responsabilidad y buen desempeño.")
                      .formatted(
                          d.get("cargo"), fecha(d.get("fechaInicio")), fecha(d.get("fechaFin")))));

  private PlantillasDeDocumento() {}

  /** Plantilla de un tipo a solicitud de parte; vacía para los de oficio (HU09). */
  public static Optional<Plantilla> de(String codigoTipo) {
    return Optional.ofNullable(PLANTILLAS.get(codigoTipo));
  }

  public static List<CampoPlantilla> campos(String codigoTipo) {
    return de(codigoTipo).map(Plantilla::campos).orElse(List.of());
  }

  private static String fecha(String iso) {
    return LocalDate.parse(iso).format(FECHA);
  }
}
