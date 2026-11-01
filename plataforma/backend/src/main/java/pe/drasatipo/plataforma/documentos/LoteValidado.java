package pe.drasatipo.plataforma.documentos;

import java.util.List;
import java.util.Map;
import pe.drasatipo.plataforma.areas.TipoDocumento;

/** Una emisión por lista ya normalizada y validada, con el texto armado con la plantilla. */
record LoteValidado(
    TipoDocumento tipo,
    Map<String, String> datos,
    List<Beneficiario> beneficiarios,
    String texto) {}
