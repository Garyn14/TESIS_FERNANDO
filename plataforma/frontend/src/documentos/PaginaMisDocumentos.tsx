import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO } from '../comun/estilos'
import { documentosDelArea, fechaCorta, type DocumentoResumen } from './api'
import Estado from './Estado'

/** HU08 (RF05): documentos del área de la persona, del más reciente al más antiguo. */
export default function PaginaMisDocumentos({ areaNombre }: { areaNombre: string | null }) {
  const [lista, setLista] = useState<DocumentoResumen[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    documentosDelArea()
      .then(setLista)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar.'))
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">
          {areaNombre ? `Documentos registrados por ${areaNombre}.` : 'Documentos de su área.'}
        </p>
        <a href="#/nuevo-documento" className={BOTON_PRIMARIO}>
          Nuevo documento
        </a>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : !areaNombre ? (
        <p role="alert" className="mt-4 rounded-xl bg-orange-pale p-4 text-ink">
          ⚠ Su cuenta no tiene un área asignada. Comuníquese con el Administrador.
        </p>
      ) : lista === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-card p-6 text-muted shadow-sm">
          Aún no hay documentos registrados en su área.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código o lote</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Beneficiario(s)</th>
                <th className="px-4 py-3 font-medium">N.° de expediente</th>
                <th className="px-4 py-3 font-medium">Fecha de envío</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => (
                <tr
                  key={d.codigo ?? `lote-${d.lote}`}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-3 font-mono whitespace-nowrap">
                    {/* HU09: un lote ocupa una sola fila y abre su propio detalle. */}
                    <a
                      href={
                        d.lote ? `#/mis-documentos/lote/${d.lote}` : `#/mis-documentos/${d.codigo}`
                      }
                      className="text-institutional hover:underline"
                    >
                      {d.lote ? `▤ Lote ${d.lote}` : d.codigo}
                    </a>
                  </td>
                  <td className="px-4 py-3">{d.tipoNombre}</td>
                  <td className="px-4 py-3">{d.beneficiario}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{d.numeroExpediente ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(d.registradoEn)}</td>
                  <td className="px-4 py-3">
                    <Estado estado={d.estado} />
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
