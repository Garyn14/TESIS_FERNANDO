package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;

/**
 * Normaliza y valida una solicitud a solicitud de parte (HU08, RF11, RF12). Los errores se
 * devuelven por campo; los de la plantilla, como {@code datos.cargo}. Las reglas de los datos del
 * beneficiario y de la plantilla se comparten con la emisión por lista (HU09).
 */
final class ValidacionDeSolicitud {

  /** Formato provisional del expediente, tomado del prototipo hasta que lo confirme el PO. */
  static final Pattern EXPEDIENTE = Pattern.compile("EXP-\\d{4}-\\d{6}");

  private static final Pattern NOMBRE = Pattern.compile("[\\p{L}][\\p{L} '\\-]{1,99}");
  private static final Pattern DNI = Pattern.compile("\\d{8}");
  private static final Pattern ENTERO = Pattern.compile("\\d{1,9}");
  private static final ZoneId ZONA = ZoneId.of("America/Lima");

  private ValidacionDeSolicitud() {}

  static SolicitudValidada validar(
      SolicitudDocumento solicitud, TipoDocumento tipo, PlantillasDeDocumento.Plantilla plantilla) {
    Map<String, String> errores = new TreeMap<>();
    String expediente = limpiar(solicitud.numeroExpediente()).toUpperCase();
    if (expediente.isEmpty()) {
      errores.put("numeroExpediente", "Ingrese el número de expediente.");
    } else if (!EXPEDIENTE.matcher(expediente).matches()) {
      errores.put(
          "numeroExpediente", "Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817.");
    }
    String nombres = nombre(solicitud.nombres(), "nombres", "Ingrese los nombres.", errores);
    String apellidos =
        nombre(solicitud.apellidos(), "apellidos", "Ingrese los apellidos.", errores);
    String dni = dni(solicitud.dni(), "dni", errores);
    Map<String, String> datos = datos(plantilla, solicitud.datos(), errores);

    if (!errores.isEmpty()) {
      throw new DatosInvalidosException(errores);
    }
    return new SolicitudValidada(
        tipo, expediente, nombres, apellidos, dni, datos, plantilla.texto().apply(datos));
  }

  /** Valida los campos de la plantilla; los errores se guardan como {@code datos.<campo>}. */
  static Map<String, String> datos(
      PlantillasDeDocumento.Plantilla plantilla,
      Map<String, String> recibidos,
      Map<String, String> errores) {
    Map<String, String> valores = recibidos == null ? Map.of() : recibidos;
    Map<String, String> datos = new LinkedHashMap<>();
    for (CampoPlantilla campo : plantilla.campos()) {
      String valor = limpiar(valores.get(campo.nombre()));
      String clave = "datos." + campo.nombre();
      switch (campo.tipo()) {
        case TEXTO -> {
          if (valor.isEmpty()) {
            errores.put(clave, "Complete este campo.");
          } else if (valor.length() < 2 || valor.length() > campo.maximo()) {
            errores.put(clave, "Use de 2 a %d caracteres.".formatted(campo.maximo()));
          }
        }
        case NUMERO -> {
          if (valor.isEmpty()) {
            errores.put(clave, "Complete este campo.");
          } else if (!ENTERO.matcher(valor).matches()
              || Integer.parseInt(valor) < 1
              || Integer.parseInt(valor) > campo.maximo()) {
            errores.put(clave, "Ingrese un número entero de 1 a %d.".formatted(campo.maximo()));
          } else {
            valor = String.valueOf(Integer.parseInt(valor));
          }
        }
        case OPCION -> {
          if (!campo.opciones().contains(valor)) {
            errores.put(clave, "Seleccione una opción.");
          }
        }
        case FECHA -> validarFecha(valor, clave, errores);
      }
      datos.put(campo.nombre(), valor);
    }
    // Regla de las plantillas con periodo: el fin no puede ser anterior al inicio.
    if (datos.containsKey("fechaInicio")
        && !errores.containsKey("datos.fechaInicio")
        && !errores.containsKey("datos.fechaFin")
        && LocalDate.parse(datos.get("fechaFin"))
            .isBefore(LocalDate.parse(datos.get("fechaInicio")))) {
      errores.put("datos.fechaFin", "La fecha de fin no puede ser anterior a la de inicio.");
    }
    return datos;
  }

  static String nombre(String valor, String campo, String vacio, Map<String, String> errores) {
    String limpio = limpiar(valor);
    if (limpio.isEmpty()) {
      errores.put(campo, vacio);
    } else if (!NOMBRE.matcher(limpio).matches()) {
      errores.put(campo, "Use solo letras, espacios, apóstrofo o guion (de 2 a 100 caracteres).");
    }
    return limpio;
  }

  static String dni(String valor, String campo, Map<String, String> errores) {
    String limpio = limpiar(valor);
    if (limpio.isEmpty()) {
      errores.put(campo, "Ingrese el DNI.");
    } else if (!DNI.matcher(limpio).matches()) {
      errores.put(campo, "El DNI debe tener 8 dígitos.");
    }
    return limpio;
  }

  private static void validarFecha(String valor, String clave, Map<String, String> errores) {
    if (valor.isEmpty()) {
      errores.put(clave, "Ingrese la fecha.");
      return;
    }
    try {
      if (LocalDate.parse(valor).isAfter(LocalDate.now(ZONA))) {
        errores.put(clave, "La fecha no puede ser posterior a hoy.");
      }
    } catch (DateTimeParseException e) {
      errores.put(clave, "Ingrese una fecha válida.");
    }
  }

  /** Quita los espacios de los extremos y deja uno solo entre palabras. */
  static String limpiar(String valor) {
    return valor == null ? "" : valor.strip().replaceAll("\\s+", " ");
  }
}
