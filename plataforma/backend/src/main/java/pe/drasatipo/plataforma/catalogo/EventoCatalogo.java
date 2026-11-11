package pe.drasatipo.plataforma.catalogo;

/** Cambios de la configuración de las áreas que quedan en el historial (DRA-60). */
public enum EventoCatalogo {
  /** Se asignó un tipo de documento a un área: sus personas pueden registrarlo. */
  TIPO_ASIGNADO,
  /** Se quitó un tipo de documento a un área: ya no se registran documentos nuevos de ese tipo. */
  TIPO_QUITADO,
  /** DRA-61: se creó un área, activa y sin tipos de documento. */
  AREA_CREADA,
  /** DRA-61: se cambió el nombre de un área; su código interno no cambia. */
  AREA_RENOMBRADA,
  /** DRA-61: se deshabilitó un área sin personas activas: no registra documentos nuevos. */
  AREA_DESHABILITADA,
  /** DRA-61: se reactivó un área, con los tipos de documento que tenía. */
  AREA_REACTIVADA
}
