package pe.drasatipo.plataforma.documentos;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Cambios campo por campo entre un documento y sus datos nuevos, como "Apellidos: Paredes Quinto →
 * Paredes Quintana". Los usan la corrección (HU15) y la reemisión (HU30).
 */
final class CambiosDeDatos {

  private CambiosDeDatos() {}

  static List<String> entre(
      Documento antes, String expediente, Beneficiario beneficiario, Map<String, String> datos) {
    Map<String, String> etiquetas = new LinkedHashMap<>();
    // En un lote los datos son del evento y no cambian: solo se comparan los del tipo.
    if (antes.getLote() == null) {
      PlantillasDeDocumento.de(antes.getTipo().getCodigo())
          .ifPresent(p -> p.campos().forEach(c -> etiquetas.put(c.nombre(), c.etiqueta())));
    }
    List<String> cambios = new ArrayList<>();
    anotar(cambios, "N.° de expediente", antes.getNumeroExpediente(), expediente);
    anotar(cambios, "Nombres", antes.getNombres(), beneficiario.nombres());
    anotar(cambios, "Apellidos", antes.getApellidos(), beneficiario.apellidos());
    anotar(cambios, "DNI", antes.getDni(), beneficiario.dni());
    etiquetas.forEach((clave, etiqueta) ->
        anotar(cambios, etiqueta, antes.getDatos().get(clave), datos.get(clave)));
    return cambios;
  }

  /** HU30: lo que cambia la reemisión respecto del original que reemplaza. */
  static List<String> deReemision(Documento reemision) {
    Documento original = reemision.getReemplazaA();
    return original == null
        ? List.of()
        : entre(
            original,
            reemision.getNumeroExpediente(),
            new Beneficiario(reemision.getNombres(), reemision.getApellidos(), reemision.getDni()),
            reemision.getDatos());
  }

  /** El detalle del historial cabe en su columna (1000 caracteres). */
  static String limitar(String detalle) {
    return detalle.length() <= 1000 ? detalle : detalle.substring(0, 999) + "…";
  }

  private static void anotar(List<String> cambios, String campo, String antes, String despues) {
    if (!Objects.equals(antes, despues)) {
      cambios.add("%s: %s → %s".formatted(campo, mostrar(antes), mostrar(despues)));
    }
  }

  /** Las fechas ISO se muestran en día/mes/año, como en la pantalla. */
  private static String mostrar(String valor) {
    if (valor == null || valor.isBlank()) {
      return "(vacío)";
    }
    return valor.matches("\\d{4}-\\d{2}-\\d{2}")
        ? valor.substring(8) + "/" + valor.substring(5, 7) + "/" + valor.substring(0, 4)
        : valor;
  }
}
