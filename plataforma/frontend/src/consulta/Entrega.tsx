import { useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { direccionDelPdf, entregar, estadoDeEntrega, type FichaDelDocumento } from './api'
import { guardarPdf, imprimirPdf } from './archivos'

/**
 * HU25 (RF45): ver, descargar o imprimir un documento firmado, sin una nueva firma. Cada descarga
 * e impresión queda en el historial; "Ver documento" no.
 */
export default function Entrega({
  ficha,
  alEntregar,
}: {
  ficha: FichaDelDocumento
  alEntregar: () => void
}) {
  const [enCurso, setEnCurso] = useState<'IMPRESION' | 'DESCARGA' | null>(null)
  const [error, setError] = useState('')
  const listo = ficha.impresiones === 0 && ficha.descargas === 0

  const hacer = (forma: 'IMPRESION' | 'DESCARGA') => {
    setEnCurso(forma)
    setError('')
    entregar(ficha.codigo, forma)
      .then((pdf) => {
        if (forma === 'IMPRESION') imprimirPdf(pdf)
        else guardarPdf(pdf, `${ficha.codigo}.pdf`)
        alEntregar()
      })
      .catch((e) =>
        setError(e instanceof ErrorApi ? e.message : 'No se pudo entregar el documento.'),
      )
      .finally(() => setEnCurso(null))
  }

  return (
    <section
      aria-label="Entrega del documento"
      className="mt-4 rounded-xl border border-line bg-card p-5 shadow-sm"
    >
      <p className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            listo ? 'bg-green-pale text-institutional' : 'bg-neutral-pale text-ink'
          }`}
        >
          {estadoDeEntrega(ficha)}
        </span>
        <span className="text-sm text-muted">
          {ficha.impresiones > 0
            ? 'Si imprime otra vez, se registra como duplicado.'
            : 'Se entrega el PDF firmado, sin una nueva firma.'}
        </span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={direccionDelPdf(ficha.codigo)}
          target="_blank"
          rel="noreferrer"
          className={BOTON_SECUNDARIO}
        >
          Ver documento
        </a>
        <button
          type="button"
          disabled={enCurso !== null}
          onClick={() => hacer('DESCARGA')}
          className={BOTON_SECUNDARIO}
        >
          {enCurso === 'DESCARGA' ? 'Descargando…' : 'Descargar PDF'}
        </button>
        <button
          type="button"
          disabled={enCurso !== null}
          onClick={() => hacer('IMPRESION')}
          className={BOTON_PRIMARIO}
        >
          {enCurso === 'IMPRESION'
            ? 'Preparando…'
            : ficha.impresiones > 0
              ? 'Imprimir duplicado'
              : 'Imprimir'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}
    </section>
  )
}
