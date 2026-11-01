package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.areas.AlcanceDeArea;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;
import pe.drasatipo.plataforma.usuarios.Rol;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Registro de documentos a solicitud de parte (HU08) y consulta de los documentos del área. La
 * regla de RF05 se decide en {@link AlcanceDeArea}.
 */
@Service
public class RegistroDeDocumentos {

  static final String TIPO_NO_ASIGNADO = "Este tipo de documento no está asignado a su área.";
  static final String DE_OTRA_AREA = "Este documento no pertenece a su área.";
  static final String EXPEDIENTE_REPETIDO =
      "El número de expediente ya está registrado en otro documento.";
  private static final ZoneId ZONA = ZoneId.of("America/Lima");

  private final AlcanceDeArea alcance;
  private final DocumentoRepository documentos;
  private final HistorialDocumentoRepository historial;
  private final UsuarioRepository usuarios;
  private final ProteccionDni proteccionDni;
  private final GeneradorDeCodigos generador;

  public RegistroDeDocumentos(
      AlcanceDeArea alcance,
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      UsuarioRepository usuarios,
      ProteccionDni proteccionDni,
      GeneradorDeCodigos generador) {
    this.alcance = alcance;
    this.documentos = documentos;
    this.historial = historial;
    this.usuarios = usuarios;
    this.proteccionDni = proteccionDni;
    this.generador = generador;
  }

  /** Valida la solicitud y arma el texto, sin guardar nada (RF12, RF18). */
  @Transactional(readOnly = true)
  public VistaPreviaRespuesta vistaPrevia(String nombreUsuario, SolicitudDocumento solicitud) {
    return VistaPreviaRespuesta.de(validar(cuenta(nombreUsuario), solicitud), firmante());
  }

  /**
   * Registra el documento y lo deja Pendiente, con su código, el token del QR y el HMAC del DNI
   * (RF16, RF17). Desde aquí no se puede modificar (RF20).
   */
  @Transactional
  public DocumentoRespuesta registrar(String nombreUsuario, SolicitudDocumento solicitud) {
    Usuario cuenta = cuenta(nombreUsuario);
    SolicitudValidada validada = validar(cuenta, solicitud);
    if (!proteccionDni.configurada()) {
      throw new ReglaDeNegocioException(
          HttpStatus.SERVICE_UNAVAILABLE,
          null,
          "Falta configurar la clave que protege el DNI, por eso no se puede registrar el"
              + " documento. Comuníquese con el Administrador.");
    }
    if (documentos.existsByNumeroExpediente(validada.numeroExpediente())) {
      throw expedienteRepetido();
    }
    int anio = LocalDate.now(ZONA).getYear();
    String codigo;
    do {
      codigo = generador.codigo(anio);
    } while (documentos.existsByCodigo(codigo));

    Documento documento =
        new Documento(
            codigo,
            generador.tokenQr(),
            validada,
            cuenta.getArea(),
            proteccionDni.hmac(validada.dni()),
            cuenta);
    try {
      documentos.saveAndFlush(documento);
    } catch (DataIntegrityViolationException e) {
      // Otra solicitud registró el mismo expediente al mismo tiempo.
      throw expedienteRepetido();
    }
    historial.save(
        new HistorialDocumento(
            documento.getId(),
            EventoDocumento.REGISTRADO,
            "Registrado y enviado a revisión por %s (%s)"
                .formatted(cuenta.getNombreCompleto(), cuenta.getArea().getNombre()),
            cuenta.getId()));
    return DocumentoRespuesta.de(documento, firmante());
  }

  /** Mis documentos: solo los del área de la persona (RF05, HU05). */
  @Transactional(readOnly = true)
  public List<DocumentoResumen> delArea(String nombreUsuario) {
    Usuario cuenta = cuenta(nombreUsuario);
    if (cuenta.getArea() == null || !alcance.estaLimitada(cuenta)) {
      return List.of();
    }
    return documentos.findByAreaIdOrderByRegistradoEnDesc(cuenta.getArea().getId()).stream()
        .map(DocumentoResumen::de)
        .toList();
  }

  /** Detalle de un documento del área. Uno de otra área o inexistente da la misma respuesta. */
  @Transactional(readOnly = true)
  public DocumentoRespuesta detalle(String nombreUsuario, String codigo) {
    Usuario cuenta = cuenta(nombreUsuario);
    return documentos
        .findByCodigo(codigo)
        .filter(d -> alcance.puedeVerArea(cuenta, d.getArea()))
        .map(d -> DocumentoRespuesta.de(d, firmante()))
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
  }

  private SolicitudValidada validar(Usuario cuenta, SolicitudDocumento solicitud) {
    TipoDocumento tipo =
        alcance
            .tipoPermitido(cuenta, solicitud.tipo())
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, TIPO_NO_ASIGNADO));
    PlantillasDeDocumento.Plantilla plantilla =
        PlantillasDeDocumento.de(tipo.getCodigo())
            .orElseThrow(
                () ->
                    new ReglaDeNegocioException(
                        HttpStatus.BAD_REQUEST,
                        "tipo",
                        "Este tipo de documento se registra por lista."));
    return ValidacionDeSolicitud.validar(solicitud, tipo, plantilla);
  }

  /** Nombre del Director que firma, para la plantilla; null si aún no hay ninguno. */
  private String firmante() {
    return usuarios
        .findFirstByRolCodigoAndActivoTrueOrderByCreadoEn(Rol.DIRECTOR)
        .map(Usuario::getNombreCompleto)
        .orElse(null);
  }

  private Usuario cuenta(String nombreUsuario) {
    return usuarios.findByNombreUsuarioIgnoreCase(nombreUsuario).orElseThrow();
  }

  private static ReglaDeNegocioException expedienteRepetido() {
    return new ReglaDeNegocioException(
        HttpStatus.CONFLICT, "numeroExpediente", EXPEDIENTE_REPETIDO);
  }
}
