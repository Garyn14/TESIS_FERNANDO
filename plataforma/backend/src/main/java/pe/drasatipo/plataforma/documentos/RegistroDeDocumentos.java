package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.areas.AlcanceDeArea;
import pe.drasatipo.plataforma.areas.TipoDocumento;
import pe.drasatipo.plataforma.areas.TipoDocumentoRespuesta;
import pe.drasatipo.plataforma.avisos.Avisos;
import pe.drasatipo.plataforma.avisos.TipoDeAviso;
import pe.drasatipo.plataforma.comun.DatosInvalidosException;
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
  private final Avisos avisos;

  public RegistroDeDocumentos(
      AlcanceDeArea alcance,
      DocumentoRepository documentos,
      HistorialDocumentoRepository historial,
      UsuarioRepository usuarios,
      ProteccionDni proteccionDni,
      GeneradorDeCodigos generador,
      Avisos avisos) {
    this.alcance = alcance;
    this.documentos = documentos;
    this.historial = historial;
    this.usuarios = usuarios;
    this.proteccionDni = proteccionDni;
    this.generador = generador;
    this.avisos = avisos;
  }

  /** HU26: avisa a los directores que el documento quedó pendiente de su revisión. */
  private void avisarPendiente(String comoEmpieza, Documento documento, String alFinal) {
    avisos.aDirectores(
        TipoDeAviso.PENDIENTE_REVISION,
        "%s: %s – %s%s"
            .formatted(
                comoEmpieza, documento.getTipo().getNombre(), documento.getBeneficiario(), alFinal),
        documento.getLote() == null
            ? "por-revisar/" + documento.getCodigo()
            : "por-revisar/lote/" + documento.getLote().getNumero());
  }

  /** Valida la solicitud y arma el texto, sin guardar nada (RF12, RF18). */
  @Transactional(readOnly = true)
  public VistaPreviaRespuesta vistaPrevia(String nombreUsuario, SolicitudDocumento solicitud) {
    return VistaPreviaRespuesta.de(validar(cuenta(nombreUsuario), solicitud), firmante());
  }

  /**
   * DRA-60: vista previa de la corrección de un observado (HU15), con el tipo del propio documento,
   * aunque ya no esté asignado al área. Igual que la corrección: una reemisión mantiene su
   * expediente.
   */
  @Transactional(readOnly = true)
  public VistaPreviaRespuesta vistaPreviaCorreccion(
      String nombreUsuario, String codigo, SolicitudDocumento solicitud) {
    Usuario cuenta = cuenta(nombreUsuario);
    Documento documento =
        documentos
            .findByCodigo(codigo)
            .filter(d -> alcance.puedeVerArea(cuenta, d.getArea()))
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
    return VistaPreviaRespuesta.de(
        validarDelTipo(
            documento.getTipo(),
            new SolicitudDocumento(
                documento.getTipo().getCodigo(),
                documento.isReemision()
                    ? documento.getNumeroExpediente()
                    : solicitud.numeroExpediente(),
                solicitud.nombres(),
                solicitud.apellidos(),
                solicitud.dni(),
                solicitud.datos())),
        firmante());
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
    avisarPendiente("Nuevo documento pendiente", documento, "");
    return DocumentoRespuesta.de(documento, firmante());
  }

  /** Mis documentos: solo los del área de la persona (RF05, HU05). */
  @Transactional(readOnly = true)
  public List<DocumentoResumen> delArea(String nombreUsuario) {
    Usuario cuenta = cuenta(nombreUsuario);
    if (cuenta.getArea() == null || !alcance.estaLimitada(cuenta)) {
      return List.of();
    }
    List<Documento> delArea =
        documentos.findByAreaIdOrderByRegistradoEnDescIdAsc(cuenta.getArea().getId());
    // HU09: los documentos de un lote se muestran en una sola fila, donde aparece el primero.
    Map<Long, List<Documento>> porLote =
        delArea.stream()
            .filter(d -> d.getLote() != null)
            .collect(Collectors.groupingBy(d -> d.getLote().getId()));
    Set<Long> mostrados = new HashSet<>();
    List<DocumentoResumen> filas = new ArrayList<>();
    for (Documento documento : delArea) {
      if (documento.getLote() == null) {
        filas.add(DocumentoResumen.de(documento));
      } else if (mostrados.add(documento.getLote().getId())) {
        filas.add(DocumentoResumen.deLote(porLote.get(documento.getLote().getId())));
      }
    }
    return filas;
  }

  /** Detalle de un documento del área. Uno de otra área o inexistente da la misma respuesta. */
  @Transactional(readOnly = true)
  public DocumentoRespuesta detalle(String nombreUsuario, String codigo) {
    Usuario cuenta = cuenta(nombreUsuario);
    return documentos
        .findByCodigo(codigo)
        .filter(d -> alcance.puedeVerArea(cuenta, d.getArea()))
        .map(this::conVinculos)
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
  }

  /**
   * DRA-60: el formulario del tipo del propio documento, para corregirlo (HU15) o reemitirlo (HU30)
   * aunque el tipo ya no esté asignado al área. Solo para quien puede ver el documento (RF05).
   */
  @Transactional(readOnly = true)
  public TipoDocumentoRespuesta formulario(String nombreUsuario, String codigo) {
    Usuario cuenta = cuenta(nombreUsuario);
    return documentos
        .findByCodigo(codigo)
        .filter(d -> alcance.puedeVerArea(cuenta, d.getArea()))
        .map(d -> TipoDocumentoRespuesta.de(d.getTipo()))
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
  }

  /** HU30: el detalle con la reemisión en curso o la que lo reemplazó. */
  DocumentoRespuesta conVinculos(Documento documento) {
    Documento reemision = documentos.reemisionVigente(documento.getId()).orElse(null);
    return DocumentoRespuesta.de(documento, firmante(), reemision);
  }

  static final String NO_FIRMADO = "Solo se reemite un documento firmado.";
  static final String REEMISION_EN_CURSO = "Este documento ya tiene una reemisión en revisión: %s.";
  static final String SIN_CAMBIOS = "Corrija al menos un dato del documento.";

  /** Lo validado de una reemisión, antes de guardarla. */
  private record ReemisionValidada(
      Documento original,
      Beneficiario beneficiario,
      Map<String, String> datos,
      String texto,
      String motivo,
      List<String> cambios) {}

  /** HU30: vista previa de la reemisión de un documento a solicitud de parte, sin guardar nada. */
  @Transactional(readOnly = true)
  public VistaPreviaRespuesta vistaPreviaReemision(
      String nombreUsuario, String codigo, SolicitudDocumento solicitud) {
    Usuario cuenta = cuenta(nombreUsuario);
    Documento original = reemitible(cuenta, codigo, false);
    if (original.getLote() != null) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, null, "Un certificado de un lote no tiene vista previa propia.");
    }
    return VistaPreviaRespuesta.de(validarSolicitud(cuenta, original, solicitud), firmante());
  }

  /**
   * HU30 (RF50): reemite un documento firmado del área propia con los datos corregidos. La
   * reemisión es un documento nuevo, Pendiente, vinculado al original, con su mismo expediente y en
   * su mismo lote. El original sigue Firmado hasta que el Director firme la reemisión.
   */
  @Transactional
  public DocumentoRespuesta reemitir(
      String nombreUsuario, String codigo, SolicitudDocumento solicitud, String motivo) {
    Usuario cuenta = cuenta(nombreUsuario);
    Documento original = reemitible(cuenta, codigo, true);
    String textoMotivo = RevisionDelDirector.motivoValido(motivo);
    if (!proteccionDni.configurada()) {
      throw new ReglaDeNegocioException(
          HttpStatus.SERVICE_UNAVAILABLE,
          null,
          "Falta configurar la clave que protege el DNI, por eso no se puede reemitir el"
              + " documento. Comuníquese con el Administrador.");
    }
    ReemisionValidada validada = validarReemision(cuenta, original, solicitud, textoMotivo);
    int anio = LocalDate.now(ZONA).getYear();
    String nuevo;
    do {
      nuevo = generador.codigo(anio);
    } while (documentos.existsByCodigo(nuevo));
    Documento reemision =
        Documento.reemisionDe(
            original,
            nuevo,
            generador.tokenQr(),
            validada.beneficiario(),
            proteccionDni.hmac(validada.beneficiario().dni()),
            validada.datos(),
            validada.texto(),
            cuenta,
            textoMotivo);
    try {
      documentos.saveAndFlush(reemision);
    } catch (DataIntegrityViolationException e) {
      // Otra reemisión del mismo original se registró al mismo tiempo (índice único).
      throw new ReglaDeNegocioException(
          HttpStatus.CONFLICT,
          null,
          REEMISION_EN_CURSO.formatted(
              documentos
                  .reemisionVigente(original.getId())
                  .map(Documento::getCodigo)
                  .orElse("otra")));
    }
    String quien = "%s (%s)".formatted(cuenta.getNombreCompleto(), cuenta.getArea().getNombre());
    historial.save(
        new HistorialDocumento(
            reemision.getId(),
            EventoDocumento.REGISTRADO,
            CambiosDeDatos.limitar(
                "Reemisión de %s registrada y enviada a revisión por %s. Motivo: %s. Cambios: %s."
                    .formatted(
                        original.getCodigo(),
                        quien,
                        textoMotivo,
                        String.join("; ", validada.cambios()))),
            cuenta.getId()));
    historial.save(
        new HistorialDocumento(
            original.getId(),
            EventoDocumento.REEMISION_SOLICITADA,
            CambiosDeDatos.limitar(
                "Reemisión solicitada por %s: %s. Motivo: %s".formatted(quien, nuevo, textoMotivo)),
            cuenta.getId()));
    avisarPendiente(
        "Reemisión pendiente", reemision, " (reemplaza a %s)".formatted(original.getCodigo()));
    return DocumentoRespuesta.de(reemision, firmante(), null);
  }

  /**
   * El original: del área propia (403), firmado y sin otra reemisión en curso (409). Al reemitir se
   * bloquea su fila hasta el fin de la transacción, como en HU15.
   */
  private Documento reemitible(Usuario cuenta, String codigo, boolean bloquear) {
    Documento original =
        (bloquear ? documentos.paraCorregir(codigo) : documentos.findByCodigo(codigo))
            .filter(d -> alcance.estaLimitada(cuenta) && alcance.puedeVerArea(cuenta, d.getArea()))
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
    if (original.getEstado() != EstadoDocumento.FIRMADO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_FIRMADO);
    }
    documentos
        .reemisionVigente(original.getId())
        .ifPresent(r -> {
          throw new ReglaDeNegocioException(
              HttpStatus.CONFLICT, null, REEMISION_EN_CURSO.formatted(r.getCodigo()));
        });
    return original;
  }

  private SolicitudValidada validarSolicitud(
      Usuario cuenta, Documento original, SolicitudDocumento solicitud) {
    return validarDelTipo(
        original.getTipo(),
        new SolicitudDocumento(
            original.getTipo().getCodigo(),
            original.getNumeroExpediente(),
            solicitud.nombres(),
            solicitud.apellidos(),
            solicitud.dni(),
            solicitud.datos()));
  }

  private ReemisionValidada validarReemision(
      Usuario cuenta, Documento original, SolicitudDocumento solicitud, String motivo) {
    Beneficiario beneficiario;
    Map<String, String> datos;
    String texto;
    if (original.getLote() == null) {
      SolicitudValidada validada = validarSolicitud(cuenta, original, solicitud);
      beneficiario = new Beneficiario(validada.nombres(), validada.apellidos(), validada.dni());
      datos = validada.datos();
      texto = validada.texto();
    } else {
      // Como en HU15: en un lote solo cambia el beneficiario; los datos del evento son del lote.
      Map<String, String> errores = new java.util.TreeMap<>();
      String nombres =
          ValidacionDeSolicitud.nombre(
              solicitud.nombres(), "nombres", "Ingrese los nombres.", errores);
      String apellidos =
          ValidacionDeSolicitud.nombre(
              solicitud.apellidos(), "apellidos", "Ingrese los apellidos.", errores);
      String dni = ValidacionDeSolicitud.dni(solicitud.dni(), "dni", errores);
      if (!errores.containsKey("dni")
          && documentos.dniVigenteEnElLote(
              original.getLote().getId(), dni, original.getId(), original.getId())) {
        errores.put("dni", DNI_EN_EL_LOTE);
      }
      if (!errores.isEmpty()) {
        throw new DatosInvalidosException(errores);
      }
      beneficiario = new Beneficiario(nombres, apellidos, dni);
      datos = original.getDatos();
      texto = original.getTexto();
    }
    List<String> cambios =
        CambiosDeDatos.entre(original, original.getNumeroExpediente(), beneficiario, datos);
    if (cambios.isEmpty()) {
      throw new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, null, SIN_CAMBIOS);
    }
    return new ReemisionValidada(original, beneficiario, datos, texto, motivo, cambios);
  }

  static final String NO_OBSERVADO =
      "Solo se corrige un documento observado. Este documento no está observado.";
  static final String DNI_EN_EL_LOTE = "El DNI ya está en otro certificado de este lote.";

  /**
   * HU15 (RF20, RF25): corrige un documento observado del área propia y lo reenvía a revisión. Uno
   * a solicitud de parte pasa por las mismas validaciones del registro; en un certificado de lote
   * solo se corrigen los nombres, los apellidos y el DNI. Los cambios quedan en el historial.
   */
  @Transactional
  public DocumentoRespuesta corregir(
      String nombreUsuario, String codigo, SolicitudDocumento solicitud) {
    Usuario cuenta = cuenta(nombreUsuario);
    Documento documento =
        documentos
            .paraCorregir(codigo)
            .filter(d -> alcance.estaLimitada(cuenta) && alcance.puedeVerArea(cuenta, d.getArea()))
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
    if (documento.getEstado() != EstadoDocumento.OBSERVADO) {
      throw new ReglaDeNegocioException(HttpStatus.CONFLICT, null, NO_OBSERVADO);
    }
    if (!proteccionDni.configurada()) {
      throw new ReglaDeNegocioException(
          HttpStatus.SERVICE_UNAVAILABLE,
          null,
          "Falta configurar la clave que protege el DNI, por eso no se puede reenviar el"
              + " documento. Comuníquese con el Administrador.");
    }
    String expediente;
    Beneficiario beneficiario;
    Map<String, String> datos;
    String texto;
    if (documento.getLote() == null) {
      SolicitudValidada validada =
          validarDelTipo(
              documento.getTipo(),
              new SolicitudDocumento(
                  documento.getTipo().getCodigo(),
                  // HU30: una reemisión mantiene el expediente del original.
                  documento.isReemision()
                      ? documento.getNumeroExpediente()
                      : solicitud.numeroExpediente(),
                  solicitud.nombres(),
                  solicitud.apellidos(),
                  solicitud.dni(),
                  solicitud.datos()));
      if (!documento.isReemision()
          && documentos.existsByNumeroExpedienteAndIdNot(
              validada.numeroExpediente(), documento.getId())) {
        throw expedienteRepetido();
      }
      expediente = validada.numeroExpediente();
      beneficiario = new Beneficiario(validada.nombres(), validada.apellidos(), validada.dni());
      datos = validada.datos();
      texto = validada.texto();
    } else {
      // En un lote solo se corrige el beneficiario: los datos del evento son del lote.
      Map<String, String> errores = new java.util.TreeMap<>();
      String nombres =
          ValidacionDeSolicitud.nombre(
              solicitud.nombres(), "nombres", "Ingrese los nombres.", errores);
      String apellidos =
          ValidacionDeSolicitud.nombre(
              solicitud.apellidos(), "apellidos", "Ingrese los apellidos.", errores);
      String dni = ValidacionDeSolicitud.dni(solicitud.dni(), "dni", errores);
      if (!errores.containsKey("dni")
          && (documento.isReemision()
              ? documentos.dniVigenteEnElLote(
                  documento.getLote().getId(),
                  dni,
                  documento.getReemplazaA().getId(),
                  documento.getId())
              : documentos.existsByLoteIdAndDniAndIdNot(
                  documento.getLote().getId(), dni, documento.getId()))) {
        errores.put("dni", DNI_EN_EL_LOTE);
      }
      if (!errores.isEmpty()) {
        throw new DatosInvalidosException(errores);
      }
      expediente = null;
      beneficiario = new Beneficiario(nombres, apellidos, dni);
      datos = documento.getDatos();
      texto = documento.getTexto();
    }
    List<String> cambios = CambiosDeDatos.entre(documento, expediente, beneficiario, datos);

    documento.corregir(
        expediente, beneficiario, proteccionDni.hmac(beneficiario.dni()), datos, texto);
    try {
      documentos.saveAndFlush(documento);
    } catch (DataIntegrityViolationException e) {
      throw expedienteRepetido();
    }
    historial.save(
        new HistorialDocumento(
            documento.getId(),
            EventoDocumento.CORREGIDO,
            "Corregido y reenviado a revisión por %s (%s). %s"
                .formatted(
                    cuenta.getNombreCompleto(),
                    cuenta.getArea().getNombre(),
                    cambios.isEmpty()
                        ? "Sin cambios en los datos."
                        : "Cambios: " + String.join("; ", cambios) + "."),
            cuenta.getId()));
    avisarPendiente("Documento corregido, pendiente de revisión", documento, "");
    return DocumentoRespuesta.de(documento, firmante());
  }

  private SolicitudValidada validar(Usuario cuenta, SolicitudDocumento solicitud) {
    TipoDocumento tipo =
        alcance
            .tipoPermitido(cuenta, solicitud.tipo())
            .orElseThrow(
                () -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, TIPO_NO_ASIGNADO));
    if (!"SOLICITUD_PARTE".equals(tipo.getOrigen())) {
      throw new ReglaDeNegocioException(
          HttpStatus.BAD_REQUEST, "tipo", "Este tipo de documento se registra por lista.");
    }
    return validarDelTipo(tipo, solicitud);
  }

  /**
   * DRA-60: la corrección (HU15) y la reemisión (HU30) validan con el tipo del documento, aunque ya
   * no esté asignado al área. La asignación solo controla el registro de documentos nuevos; la
   * visibilidad del documento se comprueba aparte, con {@code AlcanceDeArea.puedeVerArea}.
   */
  private SolicitudValidada validarDelTipo(TipoDocumento tipo, SolicitudDocumento solicitud) {
    PlantillasDeDocumento.Plantilla plantilla =
        PlantillasDeDocumento.de(tipo.getCodigo()).orElseThrow();
    return ValidacionDeSolicitud.validar(solicitud, tipo, plantilla);
  }

  /** Nombre del Director que firma, para la plantilla; null si aún no hay ninguno. */
  String firmante() {
    return usuarios
        .findFirstByRolCodigoAndActivoTrueOrderByCreadoEn(Rol.DIRECTOR)
        .map(Usuario::getNombreCompleto)
        .orElse(null);
  }

  Usuario cuenta(String nombreUsuario) {
    return usuarios.findByNombreUsuarioIgnoreCase(nombreUsuario).orElseThrow();
  }

  private static ReglaDeNegocioException expedienteRepetido() {
    return new ReglaDeNegocioException(
        HttpStatus.CONFLICT, "numeroExpediente", EXPEDIENTE_REPETIDO);
  }
}
