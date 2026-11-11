package pe.drasatipo.plataforma.areas;

import java.util.List;
import pe.drasatipo.plataforma.documentos.CampoPlantilla;
import pe.drasatipo.plataforma.documentos.PlantillasDeDocumento;

/** Tipo de documento con los campos de su formulario (HU08); sin campos para los de oficio. */
public record TipoDocumentoRespuesta(
    String codigo,
    String nombre,
    String descripcion,
    String titulo,
    String origen,
    List<CampoPlantilla> campos) {

  public static TipoDocumentoRespuesta de(TipoDocumento tipo) {
    return new TipoDocumentoRespuesta(
        tipo.getCodigo(),
        tipo.getNombre(),
        tipo.getDescripcion(),
        tipo.getTitulo(),
        tipo.getOrigen(),
        PlantillasDeDocumento.campos(tipo.getCodigo()));
  }
}
