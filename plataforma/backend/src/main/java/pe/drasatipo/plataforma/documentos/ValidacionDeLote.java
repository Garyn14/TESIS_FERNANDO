package pe.drasatipo.plataforma.documentos;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;

/**
 * Valida una emisión por lista (HU09, RF13, RF15): los datos del evento y cada fila de la relación.
 * Los errores de una fila se guardan como {@code beneficiarios[3].dni}; un DNI repetido se señala
 * en todas las filas donde aparece.
 */
final class ValidacionDeLote {

  static final int MAXIMO = 300;

  private ValidacionDeLote() {}

  static LoteValidado validar(
      SolicitudLote solicitud, TipoDocumento tipo, PlantillasDeDocumento.Plantilla plantilla) {
    Map<String, String> errores = new TreeMap<>();
    Map<String, String> datos = ValidacionDeSolicitud.datos(plantilla, solicitud.datos(), errores);

    List<Beneficiario> recibidos =
        solicitud.beneficiarios() == null ? List.of() : solicitud.beneficiarios();
    if (recibidos.isEmpty()) {
      errores.put("beneficiarios", "Agregue al menos un beneficiario.");
    } else if (recibidos.size() > MAXIMO) {
      errores.put("beneficiarios", "Un lote puede tener hasta %d beneficiarios.".formatted(MAXIMO));
    }

    List<Beneficiario> beneficiarios = new ArrayList<>();
    Map<String, Integer> primeraFila = new HashMap<>();
    for (int i = 0; i < recibidos.size(); i++) {
      Beneficiario fila = recibidos.get(i);
      String prefijo = "beneficiarios[%d].".formatted(i);
      String nombres =
          ValidacionDeSolicitud.nombre(
              fila == null ? null : fila.nombres(),
              prefijo + "nombres",
              "Ingrese los nombres.",
              errores);
      String apellidos =
          ValidacionDeSolicitud.nombre(
              fila == null ? null : fila.apellidos(),
              prefijo + "apellidos",
              "Ingrese los apellidos.",
              errores);
      String dni =
          ValidacionDeSolicitud.dni(fila == null ? null : fila.dni(), prefijo + "dni", errores);
      if (!errores.containsKey(prefijo + "dni")) {
        Integer anterior = primeraFila.putIfAbsent(dni, i);
        if (anterior != null) {
          // RF15: el DNI repetido se señala en las dos filas, con el número de la otra.
          errores.put(prefijo + "dni", "El DNI se repite en la fila %d.".formatted(anterior + 1));
          errores.putIfAbsent(
              "beneficiarios[%d].dni".formatted(anterior),
              "El DNI se repite en la fila %d.".formatted(i + 1));
        }
      }
      beneficiarios.add(new Beneficiario(nombres, apellidos, dni));
    }

    if (!errores.isEmpty()) {
      throw new DatosInvalidosException(errores);
    }
    return new LoteValidado(tipo, datos, beneficiarios, plantilla.texto().apply(datos));
  }
}
