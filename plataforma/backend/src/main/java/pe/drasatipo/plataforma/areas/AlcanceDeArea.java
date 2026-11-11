package pe.drasatipo.plataforma.areas;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.drasatipo.plataforma.usuarios.Usuario;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/**
 * Regla de control interno de RF05: un usuario de un rol limitado a su área (Emisor de área, Mesa
 * de Partes de área) solo accede a lo de su área, sin importar los permisos configurados. Es el
 * único lugar donde se decide; las historias de documentos (Sprint 2 en adelante) deben pasar por
 * aquí.
 */
@Component
public class AlcanceDeArea {

  private final TipoDocumentoRepository tipos;
  private final UsuarioRepository usuarios;

  public AlcanceDeArea(TipoDocumentoRepository tipos, UsuarioRepository usuarios) {
    this.tipos = tipos;
    this.usuarios = usuarios;
  }

  /**
   * True si la cuenta está limitada a su área: Emisor de área y, desde DRA-58, Mesa de Partes de
   * área. Lo decide una propiedad del rol, no su código.
   */
  public boolean estaLimitada(Usuario cuenta) {
    return cuenta.getRol().isLimitadoAlArea();
  }

  /**
   * DRA-58: el área a la que se limita la consulta de documentos (búsqueda, ficha y entrega), o
   * vacío si la cuenta ve todas las áreas. Una cuenta limitada sin área no ve nada (área -1).
   */
  @Transactional(readOnly = true)
  public Optional<Short> areaDeConsulta(String nombreUsuario) {
    Usuario cuenta = usuarios.findByNombreUsuarioIgnoreCase(nombreUsuario).orElseThrow();
    if (!estaLimitada(cuenta)) {
      return Optional.empty();
    }
    return Optional.of(cuenta.getArea() == null ? (short) -1 : cuenta.getArea().getId());
  }

  /**
   * Tipos de documento que la cuenta puede registrar. Área encargada: solo los de su área, o
   * ninguno si no tiene área. Otros roles: todos los activos.
   */
  public List<TipoDocumento> tiposPermitidos(Usuario cuenta) {
    if (!estaLimitada(cuenta)) {
      return tipos.findByActivoTrueOrderByNombre();
    }
    Area area = cuenta.getArea();
    if (area == null || !area.isActiva()) {
      return List.of();
    }
    return area.getTiposDocumento().stream().filter(TipoDocumento::isActivo).toList();
  }

  /** Un tipo de documento por su código, solo si la cuenta puede registrarlo (HU07). */
  public Optional<TipoDocumento> tipoPermitido(Usuario cuenta, String codigo) {
    return tiposPermitidos(cuenta).stream().filter(t -> t.getCodigo().equals(codigo)).findFirst();
  }

  /**
   * True si la cuenta puede ver lo registrado por un área: la suya, o todas si no está limitada.
   */
  public boolean puedeVerArea(Usuario cuenta, Area area) {
    if (!estaLimitada(cuenta)) {
      return true;
    }
    return cuenta.getArea() != null && cuenta.getArea().getId().equals(area.getId());
  }
}
