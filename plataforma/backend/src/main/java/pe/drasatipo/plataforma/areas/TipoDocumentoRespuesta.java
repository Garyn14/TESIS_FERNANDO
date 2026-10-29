package pe.drasatipo.plataforma.areas;

public record TipoDocumentoRespuesta(String codigo, String nombre, String titulo, String origen) {

  static TipoDocumentoRespuesta de(TipoDocumento tipo) {
    return new TipoDocumentoRespuesta(
        tipo.getCodigo(), tipo.getNombre(), tipo.getTitulo(), tipo.getOrigen());
  }
}
