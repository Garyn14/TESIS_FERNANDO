import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { documento as consultar, tipoPermitido, type Documento, type TipoDocumento } from './api'
import FormularioSolicitud from './FormularioSolicitud'

/**
 * HU15: corrección de un documento a solicitud de parte observado. Muestra el motivo de la
 * observación y el formulario del registro precargado; se reenvía con el mismo código.
 */
export default function PaginaCorreccion({ codigo }: { codigo: string }) {
  const [doc, setDoc] = useState<Documento | null>(null)
  const [tipo, setTipo] = useState<TipoDocumento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    consultar(codigo)
      .then(async (d) => {
        setDoc(d)
        if (d.estado === 'OBSERVADO' && !d.lote) setTipo(await tipoPermitido(d.tipo))
      })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a
        href={`#/mis-documentos/${codigo}`}
        className="font-medium text-institutional hover:underline"
      >
        ← Volver al documento
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : doc === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : doc.estado !== 'OBSERVADO' || doc.lote ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {doc.lote
            ? 'Este certificado es de un lote: corríjalo desde el detalle del lote.'
            : 'Solo se corrige un documento observado. Este documento no está observado.'}
        </p>
      ) : tipo === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <div className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Corregir y reenviar – {doc.tipoNombre}</h2>
          <p className="mt-1 text-muted">
            Código {doc.codigo}. Se reenvía con el mismo código; el Director lo revisará de nuevo.
          </p>
          <p className="mt-4 rounded-lg bg-orange-pale px-4 py-3">
            <strong>Motivo de la observación:</strong> {doc.motivo}
          </p>
          <FormularioSolicitud tipo={tipo} original={doc} />
        </div>
      )}
    </section>
  )
}
