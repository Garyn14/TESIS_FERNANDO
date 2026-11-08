import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi } from '../api/cliente'
import { fechaCorta } from '../documentos/api'
import Estado from '../documentos/Estado'
import { fechaYHora, fichaDelDocumento, type FichaDelDocumento } from './api'

/** Qué significa cada estado, para explicárselo al ciudadano (HU23). */
function explicacion(ficha: FichaDelDocumento): string {
  switch (ficha.estado) {
    case 'PENDIENTE':
      return 'Está en revisión del Director. Todavía no se puede entregar.'
    case 'PROCESANDO_FIRMA':
      return 'El Director está firmando el documento. Estará listo en unos minutos.'
    case 'OBSERVADO':
      return `El Director pidió corregir el documento. El ${ficha.areaNombre} lo corregirá y lo volverá a enviar.`
    case 'RECHAZADO':
      return 'El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite.'
    case 'FIRMADO':
      return 'Firmado y registrado en la blockchain. Se puede entregar al ciudadano.'
    case 'ANULADO':
      return 'Fue anulado y ya no es válido.'
  }
}

const MOTIVO: Partial<Record<FichaDelDocumento['estado'], string>> = {
  OBSERVADO: 'Motivo de la observación',
  RECHAZADO: 'Motivo del rechazo',
  ANULADO: 'Motivo de la anulación',
}

/**
 * HU23 (RF43): ficha de un documento de cualquier área para Mesa de Partes, con su estado
 * explicado y sus datos básicos.
 *
 * @param consulta la búsqueda de la que se vino (texto y filtro), para volver a ella
 */
export default function PaginaFichaDocumento({
  codigo,
  consulta,
}: {
  codigo: string
  consulta: string
}) {
  const [ficha, setFicha] = useState<FichaDelDocumento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fichaDelDocumento(codigo)
      .then(setFicha)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  const enlace = (otro: string) => (
    <a
      href={`#/buscar/${otro}${consulta ? `?${consulta}` : ''}`}
      className="font-mono text-institutional hover:underline"
    >
      {otro}
    </a>
  )

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a
        href={`#/buscar${consulta ? `?${consulta}` : ''}`}
        className="font-medium text-institutional hover:underline"
      >
        ← Volver a Buscar documentos
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : ficha === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-xl font-semibold">{ficha.codigo}</h2>
            <Estado estado={ficha.estado} />
          </div>
          <p className="mt-1 text-muted">{ficha.tipoNombre}</p>

          <section
            aria-label="Estado del trámite"
            className="mt-4 rounded-xl border border-line bg-card p-5 shadow-sm"
          >
            <p className="font-medium">{explicacion(ficha)}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <Dato etiqueta="Enviado el">{fechaYHora(ficha.registradoEn)}</Dato>
              {ficha.firmadoEn && <Dato etiqueta="Firmado el">{fechaYHora(ficha.firmadoEn)}</Dato>}
              {ficha.anuladoEn && <Dato etiqueta="Anulado el">{fechaYHora(ficha.anuladoEn)}</Dato>}
            </dl>
            {ficha.motivo && MOTIVO[ficha.estado] && (
              <p className="mt-3 rounded-lg bg-orange-pale px-4 py-3">
                <strong>{MOTIVO[ficha.estado]}:</strong> {ficha.motivo}
              </p>
            )}
            {ficha.reemplazadoPor && (
              <p className="mt-3 rounded-lg bg-blue-pale px-4 py-3">
                Fue reemplazado por el documento {enlace(ficha.reemplazadoPor)}.
              </p>
            )}
            {ficha.reemisionEnCurso && (
              <p className="mt-3 rounded-lg bg-blue-pale px-4 py-3">
                Tiene una reemisión en revisión: {enlace(ficha.reemisionEnCurso)}.
              </p>
            )}
            {ficha.reemplazaA && (
              <p className="mt-3 rounded-lg bg-blue-pale px-4 py-3">
                Reemplaza al documento {enlace(ficha.reemplazaA)}.
              </p>
            )}
          </section>

          <dl className="mt-4 grid rounded-xl border border-line bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['Beneficiario', ficha.beneficiario],
                ['DNI', ficha.dni],
                ['Tipo', ficha.tipoNombre],
                ['Origen', ficha.origen === 'OFICIO' ? 'De oficio' : 'A solicitud de parte'],
                ficha.lote
                  ? ['Lote', `Lote ${ficha.lote}`]
                  : ['N.° de expediente', ficha.numeroExpediente ?? '—'],
                ...(ficha.evento ? [['Evento', ficha.evento]] : []),
                ['Área', ficha.areaNombre],
                ['Fecha de envío', fechaCorta(ficha.registradoEn)],
              ] as [string, string][]
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="border-b border-line p-4">
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  )
}
