package pe.drasatipo.plataforma.comun;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.springframework.stereotype.Component;

/**
 * Valida una solicitud ya normalizada (por ejemplo, con espacios quitados) y lanza {@link
 * DatosInvalidosException} con un mensaje por campo.
 */
@Component
public class ValidadorDeSolicitudes {

  private final Validator validador;

  public ValidadorDeSolicitudes(Validator validador) {
    this.validador = validador;
  }

  public <T> void validar(T datos) {
    Set<ConstraintViolation<T>> errores = validador.validate(datos);
    if (errores.isEmpty()) {
      return;
    }
    // Un campo vacío incumple varias reglas a la vez: se muestra primero "Ingrese...".
    Map<String, String> campos = new TreeMap<>();
    for (ConstraintViolation<T> error : errores) {
      String campo = error.getPropertyPath().toString();
      boolean vacio = error.getConstraintDescriptor().getAnnotation() instanceof NotBlank;
      if (vacio || !campos.containsKey(campo)) {
        campos.put(campo, error.getMessage());
      }
    }
    throw new DatosInvalidosException(campos);
  }
}
