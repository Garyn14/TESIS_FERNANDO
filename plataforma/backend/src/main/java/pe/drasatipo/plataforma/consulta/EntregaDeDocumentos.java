package pe.drasatipo.plataforma.consulta;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.documentos.Documento;
import pe.drasatipo.plataforma.documentos.DocumentoRepository;
import pe.drasatipo.plataforma.documentos.EstadoDocumento;
import pe.drasatipo.plataforma.documentos.EventoDocumento;
import pe.drasatipo.plataforma.documentos.HistorialDocumento;
import pe.drasatipo.plataforma.documentos.HistorialDocumentoRepository;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;
import pe.drasatipo.plataforma.verificacion.ResultadoVerificacion.Resultado;
import pe.drasatipo.plataforma.verificacion.VerificacionDeAutenticidad;

/**
 * Entrega de un documento firmado por Mesa de Partes (HU25, RF45): el PDF final guardado en IPFS,
 * sin una nueva firma. Antes de entregarlo se hace la misma comprobación que el portal público
 * (HU21): solo se entrega un documento Válido.
 */
@Service
public class EntregaDeDocumentos {

  static final String NO_FIRMADO = "Solo se entrega un documento firmado.";
  static final String ANULADO = "El documento está anulado: no se puede entregar.";
  static final String NO_COINCIDE =
      "El documento no coincide con su registro en la blockchain. No se puede entregar."
          + " Comuníquese con el Administrador.";

  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final UsuarioRepository usuarios;
  private final VerificacionDeAutenticidad verificacion;

  public EntregaDeDocumentos(
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      UsuarioRepository usuarios,
      VerificacionDeAutenticidad verificacion) {
    this.documentos = documentos;
    this.historial = historial;
    this.usuarios = usuarios;
    this.verificacion = verificacion;
  }

  /** "Ver documento": el PDF comprobado, sin registrar nada. */
  @Transactional(readOnly = true)
  public byte[] ver(String codigo) {
    return comprobado(documento(codigo));
  }

  /**
   * Descarga o impresión: el PDF comprobado, y el evento en el historial. Si la comprobación falla,
   * no se registra nada.
   */
  @Transactional
  public byte[] entregar(String nombreUsuario, String codigo, FormaDeEntrega forma) {
    Documento documento = documento(codigo);
    byte[] pdf = comprobado(documento);
    Usuario cuenta = usuarios.findByNombreUsuarioIgnoreCase(nombreUsuario).orElseThrow();
    String quien = "%s (%s)".formatted(cuenta.getNombreCompleto(), cuenta.getRol().getNombre());
    EventoDocumento evento =
        forma == FormaDeEntrega.IMPRESION ? EventoDocumento.IMPRESO : EventoDocumento.DESCARGADO;
    String detalle;
    if (forma == FormaDeEntrega.DESCARGA) {
      detalle = "PDF descargado por " + quien;
    } else {
      long anteriores = historial.countByDocumentoIdAndEvento(documento.getId(), evento);
      detalle =
          anteriores == 0
              ? "Impreso por " + quien
              : "Duplicado impreso por %s. Impresión n.° %d".formatted(quien, anteriores + 1);
    }
    historial.save(new HistorialDocumento(documento.getId(), evento, detalle, cuenta.getId()));
    return pdf;
  }

  private Documento documento(String codigo) {
    return documentos
        .findByCodigo(codigo)
        .orElseThrow(
            () ->
                new ReglaDeNegocioException(
                    HttpStatus.NOT_FOUND, null, FichaDeDocumentos.NO_ENCONTRADO.formatted(codigo)));
  }

  /** El PDF de IPFS, solo si su hash es el registrado en el contrato y no está anulado. */
  private byte[] comprobado(Documento documento) {
    if (documento.getEstado() == EstadoDocumento.ANULADO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, ANULADO);
    }
    if (documento.getEstado() != EstadoDocumento.FIRMADO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_FIRMADO);
    }
    // La blockchain manda (RNF10): puede estar anulado en el contrato antes que en la base.
    var comprobacion = verificacion.porCodigo(documento.getCodigo());
    Resultado resultado = comprobacion.resultado().resultado();
    if (resultado == Resultado.ANULADO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, ANULADO);
    }
    if (resultado != Resultado.VALIDO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_COINCIDE);
    }
    return comprobacion.pdf();
  }
}
