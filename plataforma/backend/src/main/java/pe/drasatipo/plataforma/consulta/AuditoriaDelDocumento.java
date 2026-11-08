package pe.drasatipo.plataforma.consulta;

import java.time.OffsetDateTime;
import java.util.List;
import pe.drasatipo.plataforma.documentos.EventoDocumento;

/**
 * Historial y detalle técnico de auditoría de un documento (HU24, RF44).
 *
 * @param eventos del más antiguo al más reciente
 * @param tecnico lo registrado en IPFS y en la blockchain; vacío mientras no se prepara la firma
 */
public record AuditoriaDelDocumento(List<Evento> eventos, Tecnico tecnico) {

  /**
   * Un evento del historial.
   *
   * @param responsable nombre de quien lo registró; {@code null} si lo registró el sistema
   * @param rol el rol de quien lo registró; {@code null} si lo registró el sistema
   */
  public record Evento(
      EventoDocumento evento,
      OffsetDateTime realizadoEn,
      String responsable,
      String rol,
      String detalle) {}

  /** Lo que permite comprobar el documento en IPFS y en la blockchain. Cada dato puede faltar. */
  public record Tecnico(
      String hashPdf,
      String cid,
      String transaccion,
      Long bloque,
      String billeteraFirmante,
      OffsetDateTime registradoEn,
      String transaccionAnulacion,
      Long bloqueAnulacion,
      OffsetDateTime anuladoEn,
      String contrato) {}
}
