import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { fechaCorta } from './api'
import { bandeja, type ElementoPorRevisar } from './revision'

/** HU10 (RF21): bandeja del Director, del más antiguo al más reciente; un lote es una fila. */
export default function PaginaPorRevisar() {
  const [lista, setLista] = useState<ElementoPorRevisar[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    bandeja()
      .then(setLista)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la bandeja.'))
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p className="text-muted">
        Documentos enviados por las áreas, del más antiguo al más reciente.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : lista === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-card p-8 text-center shadow-sm">
          <span className="block text-lg font-semibold text-institutional">¡Todo al día!</span>
          No tiene documentos pendientes de revisión.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Beneficiario(s)</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Enviado por</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Fecha de envío</th>
                <th className="px-4 py-3 font-medium">Revisión</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr
                  key={e.codigo ?? `lote-${e.lote}`}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-3">{e.tipoNombre}</td>
                  <td className="px-4 py-3">
                    <a
                      href={e.lote ? `#/por-revisar/lote/${e.lote}` : `#/por-revisar/${e.codigo}`}
                      className="font-medium text-institutional hover:underline"
                    >
                      {e.lote
                        ? `▤ Lote ${e.lote} · ${e.evento} · ${e.cantidad} certificados`
                        : e.beneficiario}
                    </a>
                    {e.numeroExpediente && (
                      <span className="block text-sm text-muted">{e.numeroExpediente}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{e.areaNombre}</td>
                  <td className="px-4 py-3">{e.enviadoPor}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(e.registradoEn)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {e.revisado ? (
                      <span className="font-medium text-institutional">✓ Revisado</span>
                    ) : (
                      <span className="text-muted">Sin revisar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
