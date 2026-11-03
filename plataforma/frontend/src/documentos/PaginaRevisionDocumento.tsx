import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { fechaCorta, type Documento } from './api'
import Certificado from './Certificado'
import { revisarDocumento } from './revision'

/**
 * HU10: revisión de un documento. Abrirlo registra la revisión (RF22). Firmar, observar y rechazar
 * llegan con HU11, HU13 y HU14.
 */
export default function PaginaRevisionDocumento({ codigo }: { codigo: string }) {
  const [doc, setDoc] = useState<Documento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    revisarDocumento(codigo)
      .then(setDoc)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  const datos: [string, string][] = doc
    ? [
        ['Tipo', doc.tipoNombre],
        ['Beneficiario', `${doc.nombres} ${doc.apellidos}`],
        ['Código', doc.codigo],
        ['DNI', doc.dni],
        ...(doc.numeroExpediente
          ? [['N.° de expediente', doc.numeroExpediente] as [string, string]]
          : []),
        ['Área', doc.areaNombre],
        ['Enviado por', doc.registradoPor],
        ['Fecha de envío', fechaCorta(doc.registradoEn)],
      ]
    : []

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
        ← Volver a Por revisar
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : doc === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold">Revisión – {doc.tipoNombre}</h2>
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
          <p className="mt-4 text-sm text-muted">
            ✓ Quedó registrado como revisado. Firmar, observar y rechazar se habilitan en las
            siguientes historias (HU11, HU13 y HU14).
          </p>
        </>
      )}
    </section>
  )
}
