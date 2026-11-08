package pe.drasatipo.plataforma.consulta;

import java.util.List;

/**
 * Resultado de Buscar documentos (HU22).
 *
 * @param hayMas si hay más filas que las {@link BusquedaDeDocumentos#MAXIMO_DE_FILAS} mostradas
 */
public record ResultadoDeBusqueda(List<FilaDeBusqueda> filas, boolean hayMas) {}
