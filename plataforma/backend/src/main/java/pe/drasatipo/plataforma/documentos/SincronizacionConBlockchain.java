package pe.drasatipo.plataforma.documentos;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.drasatipo.plataforma.blockchain.BlockchainNoDisponibleException;
import pe.drasatipo.plataforma.blockchain.ContratoRegistro;
import pe.drasatipo.plataforma.blockchain.DocumentoRegistrado;
import pe.drasatipo.plataforma.blockchain.RedBlockchainProperties;
import pe.drasatipo.plataforma.blockchain.RegistroDeFirma;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Sincronización con la blockchain (HU18, RF32–RF35, RNF10). Cada cierto tiempo:
 *
 * <ol>
 *   <li>lee los eventos DocumentoRegistrado desde el último bloque procesado y pasa a Firmado los
 *       documentos que siguen en Procesando firma (por ejemplo, si se cerró el navegador antes de
 *       confirmar la firma);
 *   <li>ya al día con la cadena, devuelve a Pendiente los documentos que llevan más del plazo en
 *       Procesando firma y que el contrato no registró.
 * </ol>
 *
 * El último bloque procesado se guarda en la misma transacción en que se aplican sus eventos: tras
 * un reinicio continúa desde ahí, y aplicar dos veces un evento no cambia nada.
 */
@Service
public class SincronizacionConBlockchain {

  /** Máximo de bloques por consulta de eventos. */
  static final long TRAMO = 5000;

  private static final Logger LOG = LoggerFactory.getLogger(SincronizacionConBlockchain.class);

  private final ContratoRegistro contrato;
  private final RedBlockchainProperties red;
  private final FirmaDeDocumentos firma;
  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final UsuarioRepository usuarios;
  private final JdbcTemplate jdbc;
  private final TransactionTemplate transaccion;
  private final long bloqueInicial;
  private final Duration plazo;

  public SincronizacionConBlockchain(
      ContratoRegistro contrato,
      RedBlockchainProperties red,
      FirmaDeDocumentos firma,
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      UsuarioRepository usuarios,
      JdbcTemplate jdbc,
      PlatformTransactionManager transacciones,
      @Value("${plataforma.sincronizacion.bloque-inicial:0}") long bloqueInicial,
      @Value("${plataforma.sincronizacion.plazo-firma:15m}") Duration plazo) {
    this.contrato = contrato;
    this.red = red;
    this.firma = firma;
    this.documentos = documentos;
    this.historial = historial;
    this.usuarios = usuarios;
    this.jdbc = jdbc;
    this.transaccion = new TransactionTemplate(transacciones);
    this.bloqueInicial = bloqueInicial;
    this.plazo = plazo;
  }

  /** Resultado de una ejecución. */
  public record Resumen(long ultimoBloque, int firmados, int devueltos) {}

  /** Tarea programada. Solo corre si el contrato está configurado. */
  @Scheduled(
      fixedDelayString = "${plataforma.sincronizacion.intervalo:30s}",
      initialDelayString = "${plataforma.sincronizacion.retraso-inicial:10s}")
  public void ejecutar() {
    if (!red.contratoConfigurado()) {
      return;
    }
    try {
      Resumen resumen = sincronizar(Instant.now());
      if (resumen.firmados() > 0 || resumen.devueltos() > 0) {
        LOG.info(
            "Sincronización hasta el bloque {}: {} firmados y {} devueltos a Pendiente",
            resumen.ultimoBloque(),
            resumen.firmados(),
            resumen.devueltos());
      }
    } catch (BlockchainNoDisponibleException e) {
      // No se cambió nada: se reintenta en la siguiente ejecución.
      LOG.warn("Sincronización pospuesta: {}", e.getMessage());
    }
  }

  /** Una ejecución completa, con {@code ahora} como referencia para el plazo de firma. */
  public Resumen sincronizar(Instant ahora) {
    String direccion = red.contratoConfigurado() ? red.contrato().toLowerCase(Locale.ROOT) : "";
    long actual = contrato.bloqueActual();
    long ultimo = ultimoBloque(direccion);
    int firmados = 0;
    while (ultimo < actual) {
      long desde = ultimo + 1;
      long hasta = Math.min(actual, desde + TRAMO - 1);
      List<RegistroDeFirma> registros = contrato.registrosEntre(desde, hasta);
      Integer aplicados =
          transaccion.execute(
              estado -> {
                int cuenta = 0;
                for (RegistroDeFirma registro : registros) {
                  for (DocumentoRegistrado documento : registro.documentos()) {
                    if (aplicarSiFalta(registro, documento)) {
                      cuenta++;
                    }
                  }
                }
                guardarUltimoBloque(direccion, hasta);
                return cuenta;
              });
      firmados += aplicados == null ? 0 : aplicados;
      ultimo = hasta;
    }
    // Ya al día con la cadena: lo que sigue en Procesando firma pasado el plazo no se registró.
    int devueltos = 0;
    OffsetDateTime limite = ahora.minus(plazo).atOffset(ZoneOffset.UTC);
    for (Documento detenido : documentos.detenidosEnFirma(limite)) {
      if (contrato.estaRegistrado(detenido.getCodigo())) {
        LOG.error(
            "Inconsistencia: {} está registrado en la blockchain pero sigue en Procesando firma",
            detenido.getCodigo());
        continue;
      }
      Boolean devuelto =
          transaccion.execute(
              estado -> {
                if (documentos.devolverAPendiente(detenido.getId()) == 0) {
                  return false;
                }
                historial.save(
                    new HistorialDocumento(
                        detenido.getId(),
                        EventoDocumento.FIRMA_CANCELADA,
                        "La firma no se completó en el plazo de %d minutos y no quedó registrada en"
                                .formatted(plazo.toMinutes())
                            + " la blockchain (sincronización). Volvió a Pendiente.",
                        null));
                return true;
              });
      if (Boolean.TRUE.equals(devuelto)) {
        LOG.warn(
            "{} volvió a Pendiente: su firma no se completó en el plazo", detenido.getCodigo());
        devueltos++;
      }
    }
    return new Resumen(ultimo, firmados, devueltos);
  }

  /** Aplica un documento registrado si todavía no está Firmado; true si lo pasó a Firmado ahora. */
  private boolean aplicarSiFalta(RegistroDeFirma registro, DocumentoRegistrado documento) {
    Documento actual = documentos.findByCodigo(documento.codigo()).orElse(null);
    if (actual != null
        && actual.getEstado() == EstadoDocumento.FIRMADO
        && registro.transaccion().equalsIgnoreCase(actual.getTransaccion())) {
      return false;
    }
    Usuario firmante = usuarios.findByBilleteraIgnoreCase(documento.firmante()).orElse(null);
    return firma.aplicar(registro, documento, firmante, true) == null;
  }

  private long ultimoBloque(String direccion) {
    List<Long> guardado =
        jdbc.queryForList(
            "SELECT ultimo_bloque FROM sincronizacion_blockchain WHERE id = 1 AND contrato = ?",
            Long.class,
            direccion);
    // Otro contrato (un despliegue nuevo) empieza de nuevo desde su bloque inicial.
    return guardado.isEmpty() ? Math.max(bloqueInicial - 1, -1) : guardado.getFirst();
  }

  private void guardarUltimoBloque(String direccion, long bloque) {
    jdbc.update(
        """
        INSERT INTO sincronizacion_blockchain (id, contrato, ultimo_bloque, actualizado_en)
        VALUES (1, ?, ?, now())
        ON CONFLICT (id) DO UPDATE
          SET contrato = excluded.contrato, ultimo_bloque = excluded.ultimo_bloque,
              actualizado_en = now()
        """,
        direccion,
        bloque);
  }
}
