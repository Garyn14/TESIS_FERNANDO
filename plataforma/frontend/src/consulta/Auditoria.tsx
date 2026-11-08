import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import {
  auditoriaDelDocumento,
  fechaYHora,
  type AuditoriaDelDocumento,
  type DetalleTecnico,
  type EventoDocumento,
} from './api'

/** Título claro de cada evento del historial (HU24). */
const TITULOS: Record<EventoDocumento, string> = {
  REGISTRADO: 'Registrado y enviado a revisión',
  REVISADO: 'Revisado por el Director',
  PREPARADO: 'Firma iniciada: PDF final guardado en IPFS',
  ERROR_ALMACENAMIENTO: 'No se pudo guardar el PDF',
  FIRMADO: 'Firmado y registrado en la blockchain',
  FIRMA_CANCELADA: 'La firma no se completó',
  OBSERVADO: 'Observado por el Director',
  RECHAZADO: 'Rechazado por el Director',
  CORREGIDO: 'Corregido y reenviado a revisión',
  ANULADO: 'Anulado',
  REEMISION_SOLICITADA: 'Reemisión solicitada',
  IMPRESO: 'Impreso',
  DESCARGADO: 'PDF descargado',
}

/** Los que requieren atención: rojo lo definitivo, naranja lo que se corrige o se reintenta. */
const COLOR: Partial<Record<EventoDocumento, string>> = {
  RECHAZADO: 'bg-red-700',
  ANULADO: 'bg-red-700',
  OBSERVADO: 'bg-orange',
  FIRMA_CANCELADA: 'bg-orange',
  ERROR_ALMACENAMIENTO: 'bg-orange',
}

const SISTEMA = 'Sistema (sincronización con la blockchain)'

/** HU24 (RF44): historial y detalle técnico de auditoría, en la ficha del documento. */
export default function Auditoria({ codigo }: { codigo: string }) {
  const [auditoria, setAuditoria] = useState<AuditoriaDelDocumento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    auditoriaDelDocumento(codigo)
      .then(setAuditoria)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar el historial.'))
  }, [codigo])

  if (error)
    return (
      <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
        {error}
      </p>
    )
  if (auditoria === null) return <p className="mt-4 text-muted">Cargando el historial…</p>
  return (
    <>
      <section
        aria-labelledby="titulo-historial"
        className="mt-4 rounded-xl border border-line bg-card p-5 shadow-sm"
      >
        <h3 id="titulo-historial" className="font-semibold">
          Historial
        </h3>
        <ol className="mt-3 space-y-4">
          {auditoria.eventos.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${COLOR[e.evento] ?? 'bg-institutional'}`}
              />
              <div className="min-w-0">
                <p className="font-medium">
                  {/* HU25: desde la segunda impresión, el detalle dice que es un duplicado. */}
                  {e.evento === 'IMPRESO' && e.detalle?.startsWith('Duplicado')
                    ? 'Duplicado impreso'
                    : TITULOS[e.evento]}
                </p>
                <p className="text-sm text-muted">
                  {fechaYHora(e.realizadoEn)} ·{' '}
                  {e.responsable ? `${e.responsable} (${e.rol})` : SISTEMA}
                </p>
                {e.detalle && <p className="mt-1 text-sm break-words">{e.detalle}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <DetalleTecnicoPlegable tecnico={auditoria.tecnico} />
    </>
  )
}

function DetalleTecnicoPlegable({ tecnico }: { tecnico: DetalleTecnico }) {
  const [abierto, setAbierto] = useState(false)
  const filas: [string, string | null][] = [
    ['Huella digital del PDF (SHA-256)', tecnico.hashPdf],
    ['Identificador en IPFS (CID)', tecnico.cid],
    ['Transacción de la firma', tecnico.transaccion],
    ['Bloque de la firma', tecnico.bloque?.toString() ?? null],
    ['Billetera firmante', tecnico.billeteraFirmante],
    ['Fecha y hora del registro', tecnico.registradoEn && fechaYHora(tecnico.registradoEn)],
    ['Transacción de la anulación', tecnico.transaccionAnulacion],
    ['Bloque de la anulación', tecnico.bloqueAnulacion?.toString() ?? null],
    ['Fecha y hora de la anulación', tecnico.anuladoEn && fechaYHora(tecnico.anuladoEn)],
    ['Contrato RegistroDocumentos', tecnico.contrato],
  ]
  const presentes = filas.filter((f): f is [string, string] => Boolean(f[1]))
  return (
    <section className="mt-4 rounded-xl border border-line bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 p-5 text-left font-semibold"
      >
        <span aria-hidden="true">{abierto ? '▾' : '▸'}</span>
        Detalle técnico de auditoría
      </button>
      {abierto && (
        <div className="border-t border-line p-5">
          {tecnico.transaccion === null && (
            <p className="mb-3 text-muted">Todavía no tiene registro en la blockchain.</p>
          )}
          {presentes.length > 0 && (
            <dl className="space-y-3">
              {presentes.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <dt className="text-sm text-muted">{etiqueta}</dt>
                    <dd className="font-mono text-sm break-all">{valor}</dd>
                  </div>
                  <Copiar etiqueta={etiqueta} valor={valor} />
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  )
}

function Copiar({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copiar ${etiqueta}`}
      onClick={() =>
        navigator.clipboard
          .writeText(valor)
          .then(() => setCopiado(true))
          .catch(() => setCopiado(false))
      }
      className="shrink-0 rounded-lg border border-line px-3 py-1 text-sm hover:bg-green-pale"
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  )
}
