import { ESTADOS, type EstadoDocumento } from './api'

/** Colores de cada estado, como en el prototipo: Pendiente en ámbar, Procesando firma en azul y
 * Firmado en verde. */
const COLORES: Record<EstadoDocumento, string> = {
  PENDIENTE: 'bg-amber-pale text-amber',
  PROCESANDO_FIRMA: 'bg-blue-pale text-blue',
  FIRMADO: 'bg-green-pale text-institutional',
}

/** Etiqueta del estado de un documento (HU08, HU11, HU17). */
export default function Estado({ estado }: { estado: EstadoDocumento }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${COLORES[estado]}`}
    >
      {ESTADOS[estado]}
    </span>
  )
}
