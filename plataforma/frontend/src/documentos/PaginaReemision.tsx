import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import {
  documento as consultar,
  formularioDelDocumento,
  type Documento,
  type TipoDocumento,
} from './api'
import FormularioSolicitud from './FormularioSolicitud'

/**
 * HU30: reemisión de un documento firmado a solicitud de parte. El formulario viene precargado con
 * los datos del original; al firmarse la reemisión, el original se anula automáticamente.
 */
export default function PaginaReemision({ codigo }: { codigo: string }) {
  const [doc, setDoc] = useState<Documento | null>(null)
  const [tipo, setTipo] = useState<TipoDocumento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    consultar(codigo)
      .then(async (d) => {
        setDoc(d)
        if (d.estado === 'FIRMADO' && !d.lote && !d.reemisionEnCurso)
          setTipo(await formularioDelDocumento(d.codigo))
      })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  const aviso = !doc
    ? ''
    : doc.lote
      ? 'Este certificado es de un lote: reemítalo desde el detalle del lote.'
      : doc.estado !== 'FIRMADO'
        ? 'Solo se reemite un documento firmado.'
        : doc.reemisionEnCurso
          ? `Este documento ya tiene una reemisión en revisión: ${doc.reemisionEnCurso}.`
          : ''

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a
        href={`#/mis-documentos/${codigo}`}
        className="font-medium text-institutional hover:underline"
      >
        ← Volver al documento
      </a>
      {error || aviso ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error || aviso}
        </p>
      ) : doc === null || tipo === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <div className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Reemitir con corrección – {doc.tipoNombre}</h2>
          <p className="mt-4 rounded-lg bg-blue-pale px-4 py-3">
            Reemisión de <strong className="font-mono">{doc.codigo}</strong>. Cuando el Director
            firme el nuevo documento, el original se anulará automáticamente.
          </p>
          <FormularioSolicitud tipo={tipo} original={doc} reemision />
        </div>
      )}
    </section>
  )
}
