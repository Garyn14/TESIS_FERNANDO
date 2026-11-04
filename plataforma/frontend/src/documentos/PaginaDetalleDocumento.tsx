import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi } from '../api/cliente'
import { documento as consultar, fechaCorta, type Documento } from './api'
import Certificado from './Certificado'
import { BOTON_PRIMARIO } from '../comun/estilos'
import Estado from './Estado'

/** Qué significa cada estado para el área (HU08, HU11, HU17). */
const AVISOS: Record<Documento['estado'], string> = {
  PENDIENTE: 'Está en revisión del Director: no se puede modificar mientras esté Pendiente.',
  PROCESANDO_FIRMA: 'El Director está firmando este documento.',
  FIRMADO: 'Firmado por el Director y registrado en la blockchain.',
  OBSERVADO: 'El Director lo observó y lo devolvió al área para que lo corrija.',
  RECHAZADO: 'El Director lo rechazó. El rechazo es definitivo.',
}

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
          <p className="mt-1 text-muted">{AVISOS[doc.estado]}</p>
          {doc.motivo && (
            <p className="mt-3 rounded-lg bg-orange-pale px-4 py-3">
              <strong>Motivo:</strong> {doc.motivo}
            </p>
          )}
          {doc.estado === 'OBSERVADO' &&
            (doc.lote ? (
              <p className="mt-3 text-sm text-muted">
                Corríjalo desde el{' '}
                <a
                  href={`#/mis-documentos/lote/${doc.lote}`}
                  className="text-institutional hover:underline"
                >
                  detalle del Lote {doc.lote}
                </a>
                .
              </p>
            ) : (
              <a
                href={`#/mis-documentos/${doc.codigo}/corregir`}
                className={`mt-3 inline-block ${BOTON_PRIMARIO}`}
              >
                Corregir y reenviar
              </a>
            ))}
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
