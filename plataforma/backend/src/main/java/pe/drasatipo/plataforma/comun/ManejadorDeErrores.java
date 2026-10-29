package pe.drasatipo.plataforma.comun;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ManejadorDeErrores {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorRespuesta> datosInvalidos(MethodArgumentNotValidException e) {
    Map<String, String> campos = new LinkedHashMap<>();
    for (FieldError error : e.getBindingResult().getFieldErrors()) {
      campos.putIfAbsent(error.getField(), error.getDefaultMessage());
    }
    return ResponseEntity.badRequest()
        .body(new ErrorRespuesta("Revise los datos ingresados.", campos));
  }

  @ExceptionHandler(DatosInvalidosException.class)
  ResponseEntity<ErrorRespuesta> datosInvalidos(DatosInvalidosException e) {
    return ResponseEntity.badRequest().body(new ErrorRespuesta(e.getMessage(), e.getCampos()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ErrorRespuesta> cuerpoIlegible(HttpMessageNotReadableException e) {
    return ResponseEntity.badRequest()
        .body(new ErrorRespuesta("La solicitud no tiene el formato esperado.", Map.of()));
  }

  @ExceptionHandler(ReglaDeNegocioException.class)
  ResponseEntity<ErrorRespuesta> reglaDeNegocio(ReglaDeNegocioException e) {
    Map<String, String> campos =
        e.getCampo() == null ? Map.of() : Map.of(e.getCampo(), e.getMessage());
    return ResponseEntity.status(e.getEstado()).body(new ErrorRespuesta(e.getMessage(), campos));
  }
}
