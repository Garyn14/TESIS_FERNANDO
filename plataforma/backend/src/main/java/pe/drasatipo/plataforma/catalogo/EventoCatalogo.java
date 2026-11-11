package pe.drasatipo.plataforma.catalogo;

/** Cambios de la configuración de las áreas que quedan en el historial (DRA-60). */
public enum EventoCatalogo {
  /** Se asignó un tipo de documento a un área: sus personas pueden registrarlo. */
  TIPO_ASIGNADO,
  /** Se quitó un tipo de documento a un área: ya no se registran documentos nuevos de ese tipo. */
  TIPO_QUITADO
}
