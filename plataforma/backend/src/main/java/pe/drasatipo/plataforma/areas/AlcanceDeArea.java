package pe.drasatipo.plataforma.areas;

import java.util.List;
import org.springframework.stereotype.Component;
import pe.drasatipo.plataforma.usuarios.Rol;
import pe.drasatipo.plataforma.usuarios.Usuario;

/**
 * Regla de control interno de RF05: un usuario del Área encargada solo accede a lo de su área, sin
 * importar los permisos configurados. Es el único lugar donde se decide; las historias de
 * documentos (Sprint 2 en adelante) deben pasar por aquí.
 */
@Component
public class AlcanceDeArea {

  private final TipoDocumentoRepository tipos;

  public AlcanceDeArea(TipoDocumentoRepository tipos) {
    this.tipos = tipos;
  }

  /** True si la cuenta está limitada a su área (rol Área encargada). */
  public boolean estaLimitada(Usuario cuenta) {
    return Rol.AREA_ENCARGADA.equals(cuenta.getRol().getCodigo());
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
}
