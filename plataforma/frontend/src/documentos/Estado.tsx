import { ESTADOS, type EstadoDocumento } from './api'

/** Etiqueta del estado de un documento. Hoy solo existe Pendiente (HU08). */
export default function Estado({ estado }: { estado: EstadoDocumento }) {
  return (
    <span className="rounded-full bg-amber-pale px-3 py-1 text-sm font-medium whitespace-nowrap text-amber">
      {ESTADOS[estado]}
    </span>
  )
}
