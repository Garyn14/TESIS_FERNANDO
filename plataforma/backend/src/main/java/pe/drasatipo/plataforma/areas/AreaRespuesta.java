package pe.drasatipo.plataforma.areas;

import java.util.List;

/** Área con los tipos de documento que emite, para el formulario de cuentas (HU05). */
public record AreaRespuesta(String codigo, String nombre, List<TipoDocumentoRespuesta> tipos) {

  static AreaRespuesta de(Area area) {
    return new AreaRespuesta(
        area.getCodigo(),
        area.getNombre(),
        area.getTiposDocumento().stream()
            .filter(TipoDocumento::isActivo)
            .map(TipoDocumentoRespuesta::de)
            .toList());
  }
}
