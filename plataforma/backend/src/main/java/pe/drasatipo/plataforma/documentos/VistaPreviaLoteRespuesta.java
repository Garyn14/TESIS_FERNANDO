package pe.drasatipo.plataforma.documentos;

import java.util.List;
import java.util.Map;

/**
 * Vista previa de una emisión por lista (RF19): el certificado del primer beneficiario como ejemplo
 * y el resumen del lote.
 */
public record VistaPreviaLoteRespuesta(
    VistaPreviaRespuesta ejemplo,
    int cantidad,
    List<String> beneficiarios,
    Map<String, String> datos,
    String periodo) {}
