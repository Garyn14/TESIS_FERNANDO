import { ESTADOS, type EstadoDocumento } from './api'

/** Colores de cada estado, como en el prototipo: Pendiente en ámbar, Procesando firma en azul y
 * Firmado en verde. */
const COLORES: Record<EstadoDocumento, string> = {
  PENDIENTE: 'bg-amber-pale text-amber',
  PROCESANDO_FIRMA: 'bg-blue-pale text-blue',
  FIRMADO: 'bg-green-pale text-institutional',
  OBSERVADO: 'bg-orange-pale text-orange',
  RECHAZADO: 'bg-red-50 text-red-800',
}

/** Etiqueta del estado de un documento (HU08, HU11, HU12, HU17). */
export default function Estado({
  estado,
  cantidad,
}: {
  estado: EstadoDocumento
  /** HU12: en un lote, cuántos certificados tienen este estado. */
  cantidad?: number
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${COLORES[estado]}`}
    >
      {ESTADOS[estado]}
      {cantidad !== undefined && ` ${cantidad}`}
    </span>
  )
}
