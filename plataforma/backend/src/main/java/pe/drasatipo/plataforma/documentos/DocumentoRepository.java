package pe.drasatipo.plataforma.documentos;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.drasatipo.plataforma.usuarios.Usuario;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {

  /** Estados para las consultas JPQL. */
  String PENDIENTE = "pe.drasatipo.plataforma.documentos.EstadoDocumento.PENDIENTE";

  String PROCESANDO = "pe.drasatipo.plataforma.documentos.EstadoDocumento.PROCESANDO_FIRMA";
  String FIRMADO = "pe.drasatipo.plataforma.documentos.EstadoDocumento.FIRMADO";

  boolean existsByCodigo(String codigo);

  boolean existsByNumeroExpediente(String numeroExpediente);

  /** HU15: el expediente no se repite con otro documento (sin contarse a sí mismo). */
  boolean existsByNumeroExpedienteAndIdNot(String numeroExpediente, Long id);

  /** HU15: en un lote, el DNI no se repite con otro certificado del mismo lote. */
  boolean existsByLoteIdAndDniAndIdNot(Long loteId, String dni, Long id);

  /**
   * HU15: el documento a corregir, con su fila bloqueada hasta el fin de la transacción, para que
   * dos reenvíos a la vez no lo corrijan dos veces.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM Documento d WHERE d.codigo = :codigo")
  Optional<Documento> paraCorregir(@Param("codigo") String codigo);

  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor", "lote"})
  Optional<Documento> findByCodigo(String codigo);

  /** Mis documentos: los de un área, del más reciente al más antiguo (RF05). */
  @EntityGraph(attributePaths = {"tipo", "lote"})
  List<Documento> findByAreaIdOrderByRegistradoEnDescIdAsc(Short areaId);

  /** Bandeja "Por revisar": los pendientes, del más antiguo al más reciente (HU10, RF21). */
  @EntityGraph(attributePaths = {"tipo", "area", "registradoPor", "lote"})
  List<Documento> findByEstadoOrderByRegistradoEnAscIdAsc(EstadoDocumento estado);

  /** Documentos de un lote, en el orden de la relación de beneficiarios (HU09). */
  List<Documento> findByLoteIdOrderById(Long loteId);

  /**
   * Registra la primera revisión (HU10, RF22) en una sola sentencia: si dos solicitudes llegan a la
   * vez, PostgreSQL deja pasar solo a una. Devuelve 1 si esta solicitud la registró.
   */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.revisadoPor = :director, d.revisadoEn = :ahora"
          + " WHERE d.id = :id AND d.revisadoEn IS NULL")
  int marcarRevisado(
      @Param("id") Long id,
      @Param("director") Usuario director,
      @Param("ahora") OffsetDateTime ahora);

  /**
   * Inicia la preparación de la firma (HU17) en una sola sentencia: solo pasa a Procesando firma un
   * documento Pendiente y ya revisado. Si dos solicitudes llegan a la vez, solo una lo consigue.
   */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.estado = "
          + PROCESANDO
          + ", d.firmaIniciadaEn = :ahora WHERE d.id = :id AND d.estado = "
          + PENDIENTE
          + " AND d.revisadoEn IS NOT NULL")
  int iniciarFirma(@Param("id") Long id, @Param("ahora") OffsetDateTime ahora);

  /** Documentos que pasaron a Procesando firma antes del límite (HU18: posiblemente detenidos). */
  @Query(
      "SELECT d FROM Documento d WHERE d.estado = "
          + PROCESANDO
          + " AND d.firmaIniciadaEn < :limite ORDER BY d.firmaIniciadaEn, d.id")
  List<Documento> detenidosEnFirma(@Param("limite") OffsetDateTime limite);

  /** Guarda el PDF final de un documento en Procesando firma (HU17, RF30). */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.hashPdf = :hash, d.cid = :cid, d.fechaEmision = :fecha,"
          + " d.preparadoEn = :ahora WHERE d.id = :id AND d.estado = "
          + PROCESANDO)
  int guardarPdf(
      @Param("id") Long id,
      @Param("hash") String hash,
      @Param("cid") String cid,
      @Param("fecha") LocalDate fecha,
      @Param("ahora") OffsetDateTime ahora);

  /**
   * Pasa a Firmado un documento en Procesando firma cuyo registro se leyó en la blockchain (HU11).
   * Solo si el hash registrado es el de su PDF: si no coincide, no cambia.
   */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.estado = "
          + FIRMADO
          + ", d.firmadoPor = :director,"
          + " d.firmadoEn = :fecha, d.transaccion = :transaccion, d.bloque = :bloque,"
          + " d.billeteraFirmante = :billetera"
          + " WHERE d.id = :id AND d.estado = "
          + PROCESANDO
          + " AND d.hashPdf = :hash")
  int marcarFirmado(
      @Param("id") Long id,
      @Param("hash") String hash,
      @Param("director") Usuario director,
      @Param("fecha") OffsetDateTime fecha,
      @Param("transaccion") String transaccion,
      @Param("bloque") Long bloque,
      @Param("billetera") String billetera);

  /**
   * Observa o rechaza un documento Pendiente con su motivo (HU12), en una sola sentencia: si ya no
   * está Pendiente (por ejemplo, se está firmando), no cambia. Devuelve 1 si cambió.
   */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.estado = :estado, d.motivo = :motivo"
          + " WHERE d.id = :id AND d.estado = "
          + PENDIENTE)
  int decidir(
      @Param("id") Long id,
      @Param("estado") EstadoDocumento estado,
      @Param("motivo") String motivo);

  /**
   * Transacción con que quedó Firmado un documento, leída de la base y no de la entidad en memoria
   * (HU18: la confirmación y la sincronización pueden aplicar el mismo evento a la vez).
   */
  @Query("SELECT d.transaccion FROM Documento d WHERE d.id = :id AND d.estado = " + FIRMADO)
  Optional<String> transaccionDeFirmado(@Param("id") Long id);

  /** Devuelve a Pendiente un documento cuya preparación falló (HU17). */
  @Modifying
  @Query(
      "UPDATE Documento d SET d.estado = "
          + PENDIENTE
          + ", d.hashPdf = NULL, d.cid = NULL,"
          + " d.fechaEmision = NULL, d.preparadoEn = NULL, d.firmaIniciadaEn = NULL"
          + " WHERE d.id = :id AND d.estado = "
          + PROCESANDO)
  int devolverAPendiente(@Param("id") Long id);
}
