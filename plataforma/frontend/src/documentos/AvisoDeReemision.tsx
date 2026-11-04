import type { Reemision } from './api'

/** HU30: lo que el Director ve de una reemisión: a qué documento reemplaza, qué cambia y por qué. */
export default function AvisoDeReemision({ reemision }: { reemision: Reemision }) {
  return (
    <div role="note" className="mt-4 rounded-lg bg-blue-pale px-4 py-3">
      <p className="font-semibold">
        ↻ Este documento reemplaza a <span className="font-mono">{reemision.original}</span>
      </p>
      <p className="mt-2">Cambios:</p>
      <ul className="list-disc pl-5">
        {reemision.cambios.map((cambio) => (
          <li key={cambio}>{cambio}</li>
        ))}
      </ul>
      <p className="mt-2">
        <strong>Motivo de la reemisión:</strong> {reemision.motivo}
      </p>
      <p className="mt-2 text-sm text-muted">
        Al firmarlo, el original se anula en la misma operación de la blockchain.
      </p>
    </div>
  )
}
