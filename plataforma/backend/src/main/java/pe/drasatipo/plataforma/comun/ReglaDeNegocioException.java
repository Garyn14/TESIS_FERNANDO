package pe.drasatipo.plataforma.comun;

import org.springframework.http.HttpStatus;

/** Una solicitud válida en forma que incumple una regla de negocio, asociada a un campo. */
public class ReglaDeNegocioException extends RuntimeException {

  private final HttpStatus estado;
  private final String campo;

  public ReglaDeNegocioException(HttpStatus estado, String campo, String mensaje) {
    super(mensaje);
    this.estado = estado;
    this.campo = campo;
  }

  public HttpStatus getEstado() {
    return estado;
  }

  public String getCampo() {
    return campo;
  }
}
