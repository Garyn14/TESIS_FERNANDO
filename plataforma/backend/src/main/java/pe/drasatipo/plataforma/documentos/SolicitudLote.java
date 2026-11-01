package pe.drasatipo.plataforma.documentos;

import java.util.List;
import java.util.Map;

/** Emisión por lista (HU09): el tipo, los datos del evento y la relación de beneficiarios. */
public record SolicitudLote(
    String tipo, Map<String, String> datos, List<Beneficiario> beneficiarios) {}
