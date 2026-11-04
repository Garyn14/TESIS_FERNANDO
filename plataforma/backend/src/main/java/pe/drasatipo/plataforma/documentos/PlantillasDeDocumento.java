package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Campos y texto de cada tipo de documento (HU08, HU09, RF18). En los de solicitud de parte los
 * campos son del documento; en los de oficio, del evento, comunes a todo el lote. Los textos vienen
 * del prototipo. PENDIENTE: validarlos con el Product Owner con los ejemplos reales de cada uno.
 */
public final class PlantillasDeDocumento {

  /** Campos del formulario y cómo se arma el texto del documento con sus valores. */
  public record Plantilla(
      List<CampoPlantilla> campos, Function<Map<String, String>, String> texto) {}

  private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  /** Meses como se escriben en el Perú (setiembre), para las fechas en letras del prototipo. */
  private static final List<String> MESES =
      List.of(
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "setiembre",
          "octubre",
          "noviembre",
          "diciembre");

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
                          d.get("cargo"), fecha(d.get("fechaInicio")), fecha(d.get("fechaFin")))),
          "CERTIFICADO_CAPACITACION",
          new Plantilla(
              List.of(
                  CampoPlantilla.texto(
                      "nombreEvento",
                      "Nombre del taller",
                      "Ej.: Manejo integrado de plagas en café",
                      200),
                  CampoPlantilla.fecha("fechaInicio", "Fecha de inicio"),
                  CampoPlantilla.fecha("fechaFin", "Fecha de fin"),
                  CampoPlantilla.numero("duracionHoras", "Duración (horas)", "Ej.: 24", 1000),
                  CampoPlantilla.texto(
                      "lugar", "Lugar", "Ej.: Local comunal de Río Negro, Satipo", 150),
                  CampoPlantilla.texto("areaOrganizadora", "Área organizadora", null, 150)),
              d ->
                  ("Por haber participado en el taller de capacitación '%s', realizado %s en %s,"
                          + " con una duración de %s horas.")
                      .formatted(
                          d.get("nombreEvento"),
                          periodo(d.get("fechaInicio"), d.get("fechaFin")),
                          d.get("lugar"),
                          d.get("duracionHoras"))),
          "CERTIFICADO_RECONOCIMIENTO",
          new Plantilla(
              List.of(
                  CampoPlantilla.texto(
                      "motivo",
                      "Motivo del reconocimiento",
                      "Ej.: su destacada labor como promotor agrario",
                      300),
                  CampoPlantilla.texto(
                      "nombreEvento", "Nombre del evento", "Ej.: Día del Campesino 2026", 200),
                  CampoPlantilla.fecha("fecha", "Fecha"),
                  CampoPlantilla.texto("lugar", "Lugar", "Ej.: Plaza de Armas de Satipo", 150),
                  CampoPlantilla.texto("areaOrganizadora", "Área organizadora", null, 150)),
              d ->
                  "En reconocimiento a %s, en el marco de '%s', realizado %s en %s."
                      .formatted(
                          d.get("motivo"),
                          d.get("nombreEvento"),
                          periodo(d.get("fecha"), d.get("fecha")),
                          d.get("lugar"))));

  private PlantillasDeDocumento() {}

  /** Plantilla de un tipo de documento, o vacía si el tipo no tiene plantilla. */
  public static Optional<Plantilla> de(String codigoTipo) {
    return Optional.ofNullable(PLANTILLAS.get(codigoTipo));
  }

  public static List<CampoPlantilla> campos(String codigoTipo) {
    return de(codigoTipo).map(Plantilla::campos).orElse(List.of());
  }

  private static String fecha(String iso) {
    return LocalDate.parse(iso).format(FECHA);
  }

  /**
   * Periodo en letras, como en el prototipo: "el 14 de setiembre de 2026", "del 14 al 16 de
   * setiembre de 2026", "del 28 de setiembre al 2 de octubre de 2026" o, si cambia el año, "del 30
   * de diciembre de 2025 al 2 de enero de 2026".
   */
  public static String periodo(String inicioIso, String finIso) {
    LocalDate inicio = LocalDate.parse(inicioIso);
    LocalDate fin = LocalDate.parse(finIso);
    String finEnLetras = enLetras(fin);
    if (inicio.equals(fin)) {
      return "el " + finEnLetras;
    }
    String desde;
    if (inicio.getYear() != fin.getYear()) {
      desde = enLetras(inicio);
    } else if (inicio.getMonth() != fin.getMonth()) {
      desde = inicio.getDayOfMonth() + " de " + MESES.get(inicio.getMonthValue() - 1);
    } else {
      desde = String.valueOf(inicio.getDayOfMonth());
    }
    return "del " + desde + " al " + finEnLetras;
  }

  /** Fecha con el mes en letras: "4 de noviembre de 2026". */
  static String enLetras(LocalDate fecha) {
    return fecha.getDayOfMonth()
        + " de "
        + MESES.get(fecha.getMonthValue() - 1)
        + " de "
        + fecha.getYear();
  }
}
