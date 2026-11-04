package pe.drasatipo.plataforma.documentos;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.blockchain.DocumentoRegistrado;
import pe.drasatipo.plataforma.blockchain.RegistroDeFirma;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;

/**
 * Firma de documentos (HU11, RF28–RF32). La billetera del Director registra en el contrato los
 * documentos preparados (HU17); el servidor nunca envía transacciones ni conoce claves (RNF05).
 * Solo marca un documento como Firmado después de leer su registro en la blockchain, y solo lo
 * devuelve a Pendiente después de comprobar en el contrato que no quedó registrado.
 */
@Service
public class FirmaDeDocumentos {

  static final String TRANSACCION_INVALIDA =
      "La transacción no se encontró, no se confirmó o no registró documentos en el contrato de la"
          + " plataforma.";
  static final String OTRA_BILLETERA =
      "La transacción la firmó una billetera distinta de la registrada para su cuenta.";
  static final String NO_EN_PROCESO = "El documento no está en proceso de firma.";
  static final String HASH_DISTINTO =
      "El hash registrado no coincide con el del PDF preparado. Se revisará al sincronizar.";
  static final String YA_REGISTRADO =
      "El documento ya quedó registrado en la blockchain. Se confirmará al sincronizar.";
  static final String SIN_CODIGOS = "Indique los documentos cuya firma no se completó.";

  private static final Pattern TRANSACCION = Pattern.compile("^0x[0-9a-fA-F]{64}$");
  private static final Logger LOG = LoggerFactory.getLogger(FirmaDeDocumentos.class);

  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final RegistroDeDocumentos registro;
  private final ContratoRegistro contrato;

  public FirmaDeDocumentos(
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      RegistroDeDocumentos registro,
      ContratoRegistro contrato) {
    this.documentos = documentos;
    this.historial = historial;
    this.registro = registro;
    this.contrato = contrato;
  }

  /**
   * Billetera registrada del Director y si el contrato le reconoce el rol de firmante. Con la
   * blockchain caída, {@code firmante} es nulo y {@code aviso} explica el motivo.
   */
  public record EstadoBilletera(String billetera, Boolean firmante, String aviso) {}

  public record Firmado(String codigo, String fechaEmision) {}

  public record NoAplicado(String codigo, String motivo) {}

  public record Confirmacion(
      String transaccion, long bloque, List<Firmado> firmados, List<NoAplicado> noAplicados) {}

  public record Cancelacion(List<String> devueltos, List<NoAplicado> noDevueltos) {}

  @Transactional(readOnly = true)
  public EstadoBilletera billetera(String nombreUsuario) {
    Usuario director = registro.cuenta(nombreUsuario);
    if (director.getBilletera() == null) {
      return new EstadoBilletera(null, false, PreparacionDeFirma.SIN_BILLETERA);
    }
    try {
      boolean firmante = contrato.esFirmante(director.getBilletera());
      return new EstadoBilletera(
          director.getBilletera(), firmante, firmante ? null : PreparacionDeFirma.NO_ES_FIRMANTE);
    } catch (BlockchainNoDisponibleException e) {
      return new EstadoBilletera(director.getBilletera(), null, e.getMessage());
    }
  }

  /**
   * La billetera avisa que su transacción se confirmó. Se lee en la blockchain y sus documentos
   * pasan a Firmado, con la fecha del bloque como fecha oficial de emisión (RF32). Repetir la
   * confirmación no cambia nada.
   */
  @Transactional
  public Confirmacion confirmar(String nombreUsuario, String transaccion) {
    if (transaccion == null || !TRANSACCION.matcher(transaccion).matches()) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, "transaccion", TRANSACCION_INVALIDA);
    }
    Usuario director = registro.cuenta(nombreUsuario);
    RegistroDeFirma firma;
    try {
      firma =
          contrato
              .registroDeFirmaEn(transaccion)
              .orElseThrow(
                  () ->
                      new ReglaDeNegocioException(
                          HttpStatus.CONFLICT, "transaccion", TRANSACCION_INVALIDA));
    } catch (BlockchainNoDisponibleException e) {
      throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
    }
    if (firma.documentos().stream()
        .anyMatch(d -> !d.firmante().equalsIgnoreCase(String.valueOf(director.getBilletera())))) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, "transaccion", OTRA_BILLETERA);
    }
    var fecha = firma.fecha().atOffset(ZoneOffset.UTC);
    List<Firmado> firmados = new ArrayList<>();
    List<NoAplicado> noAplicados = new ArrayList<>();
    for (DocumentoRegistrado registrado : firma.documentos()) {
      Documento documento = documentos.findByCodigo(registrado.codigo()).orElse(null);
      if (documento != null
          && documento.getEstado() == EstadoDocumento.FIRMADO
          && transaccion.equalsIgnoreCase(documento.getTransaccion())) {
        firmados.add(new Firmado(documento.getCodigo(), fecha.toString()));
        continue;
      }
      if (documento == null || documento.getEstado() != EstadoDocumento.PROCESANDO_FIRMA) {
        LOG.warn(
            "La transacción {} registró {}, que no está en proceso de firma",
            transaccion,
            registrado.codigo());
        noAplicados.add(new NoAplicado(registrado.codigo(), NO_EN_PROCESO));
        continue;
      }
      int cambiados =
          documentos.marcarFirmado(
              documento.getId(),
              registrado.hashPdf(),
              director,
              fecha,
              transaccion,
              firma.bloque(),
              registrado.firmante());
      if (cambiados == 0) {
        LOG.error(
            "El hash registrado de {} en {} no coincide con el de su PDF",
            registrado.codigo(),
            transaccion);
        noAplicados.add(new NoAplicado(registrado.codigo(), HASH_DISTINTO));
        continue;
      }
      historial.save(
          new HistorialDocumento(
              documento.getId(),
              EventoDocumento.FIRMADO,
              "Firmado por %s con la billetera %s; transacción %s; bloque %d"
                  .formatted(
                      director.getNombreCompleto(),
                      registrado.firmante(),
                      transaccion,
                      firma.bloque()),
              director.getId()));
      firmados.add(new Firmado(documento.getCodigo(), fecha.toString()));
    }
    LOG.info(
        "Transacción {} (bloque {}): {} documentos firmados",
        transaccion,
        firma.bloque(),
        firmados.size());
    return new Confirmacion(transaccion, firma.bloque(), firmados, noAplicados);
  }

  /**
   * La firma no se completó (se canceló en la billetera o la transacción falló): los documentos
   * vuelven a Pendiente, siguen revisados, y el motivo queda en su historial. Antes se comprueba en
   * el contrato que no quedaron registrados.
   */
  @Transactional
  public Cancelacion cancelar(String nombreUsuario, List<String> codigos, String motivo) {
    Set<String> seleccion = new LinkedHashSet<>();
    if (codigos != null) {
      codigos.stream()
          .filter(c -> c != null && !c.isBlank())
          .map(String::trim)
          .forEach(seleccion::add);
    }
    if (seleccion.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "codigos", SIN_CODIGOS);
    }
    if (seleccion.size() > PreparacionDeFirma.MAXIMO) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, "codigos", PreparacionDeFirma.DEMASIADOS);
    }
    Usuario director = registro.cuenta(nombreUsuario);
    String razon =
        motivo == null || motivo.isBlank()
            ? "La firma no se completó"
            : motivo.strip().substring(0, Math.min(200, motivo.strip().length()));
    List<String> devueltos = new ArrayList<>();
    List<NoAplicado> noDevueltos = new ArrayList<>();
    for (String codigo : seleccion) {
      Documento documento = documentos.findByCodigo(codigo).orElse(null);
      if (documento == null || documento.getEstado() != EstadoDocumento.PROCESANDO_FIRMA) {
        noDevueltos.add(new NoAplicado(codigo, NO_EN_PROCESO));
        continue;
      }
      boolean registrado;
      try {
        registrado = contrato.estaRegistrado(codigo);
      } catch (BlockchainNoDisponibleException e) {
        // Sin la blockchain no se puede saber si quedó registrado: no se cambia nada (HU18).
        throw new ReglaDeNegocioException(HttpStatus.SERVICE_UNAVAILABLE, null, e.getMessage());
      }
      if (registrado) {
        LOG.warn("{} está registrado en la blockchain: no vuelve a Pendiente", codigo);
        noDevueltos.add(new NoAplicado(codigo, YA_REGISTRADO));
        continue;
      }
      if (documentos.devolverAPendiente(documento.getId()) == 1) {
        historial.save(
            new HistorialDocumento(
                documento.getId(),
                EventoDocumento.FIRMA_CANCELADA,
                razon + ". Volvió a Pendiente.",
                director.getId()));
        devueltos.add(codigo);
      }
    }
    return new Cancelacion(devueltos, noDevueltos);
  }
}
