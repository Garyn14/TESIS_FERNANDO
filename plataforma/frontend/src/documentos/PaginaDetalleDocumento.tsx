import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi } from '../api/cliente'
import { documento as consultar, fechaCorta, type Documento } from './api'
import Certificado from './Certificado'
import Estado from './Estado'

/**
 * HU08: detalle de un documento del área. Mientras está Pendiente no hay ninguna opción para
 * modificarlo (RF20). Uno de otra área no se muestra (RF05).
 */
export default function PaginaDetalleDocumento({ codigo }: { codigo: string }) {
  const [doc, setDoc] = useState<Documento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    consultar(codigo)
      .then(setDoc)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  const datos: [string, ReactNode][] = doc
    ? [
        ['Tipo', doc.tipoNombre],
        ['Beneficiario', `${doc.nombres} ${doc.apellidos}`],
        ['Código', doc.codigo],
        ['DNI', doc.dni],
        // HU09: los de una emisión por lista no tienen expediente, sino lote.
        doc.lote
          ? [
              'Lote',
              <a
                key="lote"
                href={`#/mis-documentos/lote/${doc.lote}`}
                className="text-institutional hover:underline"
              >
                Lote {doc.lote}
              </a>,
            ]
          : ['N.° de expediente', doc.numeroExpediente],
        ['Área', doc.areaNombre],
        ['Enviado por', doc.registradoPor],
        ['Fecha de envío', fechaCorta(doc.registradoEn)],
      ]
    : []

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/mis-documentos" className="font-medium text-institutional hover:underline">
        ← Volver a Mis documentos
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : doc === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">{doc.tipoNombre}</h2>
            <Estado estado={doc.estado} />
          </div>
          <p className="mt-1 text-muted">
            Está en revisión del Director: no se puede modificar mientras esté Pendiente.
          </p>
          <dl className="mt-4 grid rounded-xl border border-line bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {datos.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="border-b border-line p-4">
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <Certificado documento={doc} />
          </div>
        </>
      )}
    </section>
  )
}
