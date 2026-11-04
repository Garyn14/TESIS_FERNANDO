package pe.drasatipo.plataforma.documentos;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.areas.AlcanceDeArea;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Usuario;

/**
 * Emisión por lista (HU09): plantilla Excel, vista previa y registro del lote con un documento por
 * beneficiario (RF13–RF19). La regla de RF05 se decide en {@link AlcanceDeArea}.
 */
@Service
public class RegistroDeLotes {

  static final String DE_OTRA_AREA = "Este lote no pertenece a su área.";
  private static final ZoneId ZONA = ZoneId.of("America/Lima");

  /** Clave del bloqueo de PostgreSQL que ordena la numeración de los lotes. */
  private static final long BLOQUEO_NUMERACION = 20_260_901L;

  private final RegistroDeDocumentos registro;
  private final AlcanceDeArea alcance;
  private final LoteRepository lotes;
  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final ProteccionDni proteccionDni;
  private final GeneradorDeCodigos generador;
  private final ExcelDeBeneficiarios excel;
  private final JdbcTemplate jdbc;

  public RegistroDeLotes(
      RegistroDeDocumentos registro,
      AlcanceDeArea alcance,
      LoteRepository lotes,
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      ProteccionDni proteccionDni,
      GeneradorDeCodigos generador,
      ExcelDeBeneficiarios excel,
      JdbcTemplate jdbc) {
    this.registro = registro;
    this.alcance = alcance;
    this.lotes = lotes;
    this.documentos = documentos;
    this.historial = historial;
    this.proteccionDni = proteccionDni;
    this.generador = generador;
    this.excel = excel;
    this.jdbc = jdbc;
  }

  /** Plantilla Excel, solo para un tipo de oficio del área de la persona (RF14). */
  @Transactional(readOnly = true)
  public byte[] plantilla(String nombreUsuario, String tipo) {
    tipoDeOficio(registro.cuenta(nombreUsuario), tipo);
    return excel.plantilla();
  }

  /** Filas del Excel importado, sin validar: se validan igual que las ingresadas a mano. */
  public List<Beneficiario> importar(InputStream archivo) throws IOException {
    try (archivo) {
      return excel.leer(archivo);
    }
  }

  @Transactional(readOnly = true)
  public VistaPreviaLoteRespuesta vistaPrevia(String nombreUsuario, SolicitudLote solicitud) {
    LoteValidado lote = validar(registro.cuenta(nombreUsuario), solicitud);
    Beneficiario primero = lote.beneficiarios().getFirst();
    return new VistaPreviaLoteRespuesta(
        ejemplo(lote.tipo(), primero, lote.texto()),
        lote.beneficiarios().size(),
        lote.beneficiarios().stream().map(b -> b.nombres() + " " + b.apellidos()).toList(),
        lote.datos(),
        periodo(lote.datos()));
  }

  /**
   * Registra el lote y un documento Pendiente por beneficiario, cada uno con su código, token y
   * HMAC del DNI (RF16, RF17, RF19). Todo se crea en una sola transacción, o nada.
   */
  @Transactional
  public LoteRespuesta registrar(String nombreUsuario, SolicitudLote solicitud) {
    Usuario cuenta = registro.cuenta(nombreUsuario);
    LoteValidado validado = validar(cuenta, solicitud);
    if (!proteccionDni.configurada()) {
      throw new ReglaDeNegocioException(
          HttpStatus.SERVICE_UNAVAILABLE,
          null,
          "Falta configurar la clave que protege el DNI, por eso no se puede registrar el"
              + " lote. Comuníquese con el Administrador.");
    }
    int anio = LocalDate.now(ZONA).getYear();
    // Dos envíos simultáneos esperan su turno aquí, para no recibir el mismo número.
    jdbc.execute("SELECT pg_advisory_xact_lock(" + BLOQUEO_NUMERACION + ")");
    String numero = "%d-%03d".formatted(anio, lotes.countByNumeroStartingWith(anio + "-") + 1);
    Lote lote = lotes.save(new Lote(numero, validado, cuenta.getArea(), cuenta));

    Set<String> usados = new HashSet<>();
    for (Beneficiario beneficiario : validado.beneficiarios()) {
      String codigo;
      do {
        codigo = generador.codigo(anio);
      } while (!usados.add(codigo) || documentos.existsByCodigo(codigo));
      Documento documento =
          documentos.save(
              new Documento(
                  codigo,
                  generador.tokenQr(),
                  lote,
                  beneficiario,
                  proteccionDni.hmac(beneficiario.dni())));
      historial.save(
          new HistorialDocumento(
              documento.getId(),
              EventoDocumento.REGISTRADO,
              "Registrado en el Lote %s y enviado a revisión por %s (%s)"
                  .formatted(numero, cuenta.getNombreCompleto(), cuenta.getArea().getNombre()),
              cuenta.getId()));
    }
    documentos.flush();
    return respuesta(lote);
  }

  /** Detalle de un lote del área. Uno de otra área o inexistente da la misma respuesta. */
  @Transactional(readOnly = true)
  public LoteRespuesta detalle(String nombreUsuario, String numero) {
    Usuario cuenta = registro.cuenta(nombreUsuario);
    return lotes
        .findByNumero(numero)
        .filter(l -> alcance.puedeVerArea(cuenta, l.getArea()))
        .map(this::respuesta)
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
  }

  LoteRespuesta respuesta(Lote lote) {
    List<Documento> certificados = documentos.findByLoteIdOrderById(lote.getId());
    // HU30: la reemisión de un certificado queda en el mismo lote.
    java.util.Map<Long, Documento> reemisiones = new java.util.HashMap<>();
    certificados.stream()
        .filter(d -> d.isReemision() && d.getEstado() != EstadoDocumento.RECHAZADO)
        .forEach(d -> reemisiones.put(d.getReemplazaA().getId(), d));
    List<LoteRespuesta.DocumentoDelLote> delLote =
        certificados.stream()
            .map(
                d -> {
                  DocumentoRespuesta vinculos =
                      DocumentoRespuesta.de(d, null, reemisiones.get(d.getId()));
                  return new LoteRespuesta.DocumentoDelLote(
                      d.getCodigo(),
                      d.getNombres(),
                      d.getApellidos(),
                      d.getDni(),
                      d.getEstado(),
                      vinculos.motivo(),
                      vinculos.reemision(),
                      vinculos.reemisionEnCurso(),
                      vinculos.reemplazadoPor());
                })
            .toList();
    LoteRespuesta.DocumentoDelLote primero = delLote.getFirst();
    return new LoteRespuesta(
        lote.getNumero(),
        lote.getTipo().getCodigo(),
        lote.getTipo().getNombre(),
        lote.getArea().getNombre(),
        lote.getRegistradoPor().getNombreCompleto(),
        lote.getRegistradoEn(),
        lote.getDatos(),
        periodo(lote.getDatos()),
        ejemplo(
            lote.getTipo(),
            new Beneficiario(primero.nombres(), primero.apellidos(), primero.dni()),
            lote.getTexto()),
        delLote);
  }

  private VistaPreviaRespuesta ejemplo(
      TipoDocumento tipo, Beneficiario beneficiario, String texto) {
    return new VistaPreviaRespuesta(
        tipo.getCodigo(),
        tipo.getNombre(),
        tipo.getTitulo(),
        null,
        beneficiario.nombres(),
        beneficiario.apellidos(),
        beneficiario.dni(),
        texto,
        registro.firmante());
  }

  private LoteValidado validar(Usuario cuenta, SolicitudLote solicitud) {
    TipoDocumento tipo = tipoDeOficio(cuenta, solicitud.tipo());
    return ValidacionDeLote.validar(
        solicitud, tipo, PlantillasDeDocumento.de(tipo.getCodigo()).orElseThrow());
  }

  private TipoDocumento tipoDeOficio(Usuario cuenta, String codigo) {
    TipoDocumento tipo =
        alcance
            .tipoPermitido(cuenta, codigo)
            .orElseThrow(
                () ->
                    new ReglaDeNegocioException(
                        HttpStatus.FORBIDDEN, null, RegistroDeDocumentos.TIPO_NO_ASIGNADO));
    if (!"OFICIO".equals(tipo.getOrigen())) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST,
          "tipo",
          "Este tipo de documento se registra a solicitud de parte, con su número de expediente.");
    }
    return tipo;
  }

  /** Periodo del evento en letras, para el resumen: "del 14 al 16 de setiembre de 2026". */
  private static String periodo(Map<String, String> datos) {
    String inicio = datos.getOrDefault("fechaInicio", datos.get("fecha"));
    String fin = datos.getOrDefault("fechaFin", datos.get("fecha"));
    return PlantillasDeDocumento.periodo(inicio, fin);
  }
}
