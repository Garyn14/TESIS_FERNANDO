import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { fechaCorta, type Lote } from './api'
import Certificado from './Certificado'
import { revisarLote } from './revision'

/**
 * HU10: revisión de un lote. A la izquierda, el certificado del beneficiario elegido; a la derecha,
 * la relación. Abrir el lote cuenta como revisión de todos sus documentos (RF22).
 */
export default function PaginaRevisionLote({ numero }: { numero: string }) {
  const [lote, setLote] = useState<Lote | null>(null)
  const [error, setError] = useState('')
  const [actual, setActual] = useState(0)
  useEffect(() => {
    revisarLote(numero)
      .then(setLote)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el lote.'))
  }, [numero])

  const total = lote?.documentos.length ?? 0
  const elegido = lote?.documentos[actual]

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
        ← Volver a Por revisar
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : lote === null || !elegido ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold">Revisión de lote – Lote {lote.numero}</h2>
          <p className="mt-2 rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
            <strong>{lote.tipoNombre}</strong> · {lote.datos.nombreEvento} · {lote.periodo}
            {lote.datos.lugar && ` · ${lote.datos.lugar}`}
            <span className="block text-sm text-muted">
              Enviado por {lote.registradoPor} ({lote.areaNombre}) el{' '}
              {fechaCorta(lote.registradoEn)}
            </span>
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div>
              <Certificado
                documento={{
                  ...lote.ejemplo,
                  nombres: elegido.nombres,
                  apellidos: elegido.apellidos,
                  dni: elegido.dni,
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded px-3 py-2 font-medium text-institutional hover:bg-green-pale disabled:opacity-40"
                  disabled={actual === 0}
                  onClick={() => setActual((i) => i - 1)}
                >
                  ‹ Anterior
                </button>
                <span className="text-sm text-muted">
                  Certificado {actual + 1} de {total}
                </span>
                <button
                  type="button"
                  className="rounded px-3 py-2 font-medium text-institutional hover:bg-green-pale disabled:opacity-40"
                  disabled={actual === total - 1}
                  onClick={() => setActual((i) => i + 1)}
                >
                  Siguiente ›
                </button>
              </div>
            </div>
            <aside
              aria-label="Beneficiarios del lote"
              className="rounded-xl border border-line bg-card shadow-sm"
            >
              <h3 className="border-b border-line p-3 font-semibold">Beneficiarios ({total})</h3>
              <ol className="max-h-[28rem] overflow-y-auto">
                {lote.documentos.map((d, i) => (
                  <li key={d.codigo}>
                    <button
                      type="button"
                      aria-pressed={i === actual}
                      onClick={() => setActual(i)}
                      className={`flex w-full justify-between gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-green-pale ${i === actual ? 'bg-green-pale font-semibold text-institutional' : ''}`}
                    >
                      <span>
                        {i + 1}. {d.nombres} {d.apellidos}
                      </span>
                      <span className="text-sm text-muted">{d.dni}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
          <p className="mt-4 text-sm text-muted">
            ✓ El lote quedó registrado como revisado: cuenta para sus {total} certificados. Firmar
            el lote se habilita con la HU12.
          </p>
        </>
      )}
    </section>
  )
}
