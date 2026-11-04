package pe.drasatipo.plataforma.documentos;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
        .map(d -> DocumentoRespuesta.de(d, firmante()))
        .orElseThrow(() -> new ReglaDeNegocioException(HttpStatus.FORBIDDEN, null, DE_OTRA_AREA));
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
    List<String> cambios = new ArrayList<>();
    Map<String, String> antes = new LinkedHashMap<>();
    antes.put("N.° de expediente", documento.getNumeroExpediente());
    antes.put("Nombres", documento.getNombres());
    antes.put("Apellidos", documento.getApellidos());
    antes.put("DNI", documento.getDni());
    String expediente;
    Beneficiario beneficiario;
    Map<String, String> datos;
    String texto;
    Map<String, String> etiquetas = new LinkedHashMap<>();
    if (documento.getLote() == null) {
      SolicitudValidada validada =
          validar(
              cuenta,
              new SolicitudDocumento(
                  documento.getTipo().getCodigo(),
                  solicitud.numeroExpediente(),
                  solicitud.nombres(),
                  solicitud.apellidos(),
                  solicitud.dni(),
                  solicitud.datos()));
      if (documentos.existsByNumeroExpedienteAndIdNot(
          validada.numeroExpediente(), documento.getId())) {
        throw expedienteRepetido();
      }
      expediente = validada.numeroExpediente();
      beneficiario = new Beneficiario(validada.nombres(), validada.apellidos(), validada.dni());
      datos = validada.datos();
      texto = validada.texto();
      PlantillasDeDocumento.de(documento.getTipo().getCodigo())
          .orElseThrow()
          .campos()
          .forEach(c -> etiquetas.put(c.nombre(), c.etiqueta()));
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
          && documentos.existsByLoteIdAndDniAndIdNot(
              documento.getLote().getId(), dni, documento.getId())) {
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
    Map<String, String> despues = new LinkedHashMap<>();
    despues.put("N.° de expediente", expediente);
    despues.put("Nombres", beneficiario.nombres());
    despues.put("Apellidos", beneficiario.apellidos());
    despues.put("DNI", beneficiario.dni());
    antes.forEach((campo, valor) -> anotarCambio(cambios, campo, valor, despues.get(campo)));
    etiquetas.forEach(
        (clave, etiqueta) ->
            anotarCambio(cambios, etiqueta, documento.getDatos().get(clave), datos.get(clave)));

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
    return DocumentoRespuesta.de(documento, firmante());
  }

  private static void anotarCambio(
      List<String> cambios, String campo, String antes, String despues) {
    if (!java.util.Objects.equals(antes, despues)) {
      cambios.add("%s: %s → %s".formatted(campo, mostrar(antes), mostrar(despues)));
    }
  }

  /** Las fechas ISO se muestran en día/mes/año, como en la pantalla. */
  private static String mostrar(String valor) {
    if (valor == null || valor.isBlank()) {
      return "(vacío)";
    }
    return valor.matches("\\d{4}-\\d{2}-\\d{2}")
        ? valor.substring(8) + "/" + valor.substring(5, 7) + "/" + valor.substring(0, 4)
        : valor;
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
