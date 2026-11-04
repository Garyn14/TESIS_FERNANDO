import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_ADVERTENCIA } from '../comun/estilos'
import { fechaCorta } from '../documentos/api'
import Estado from '../documentos/Estado'
import VentanaDeMotivo from '../documentos/VentanaDeMotivo'
import { firmados, solicitarAnulacion, type DocumentoFirmado } from './anulacion'
import VentanaDeAnulacion from './VentanaDeAnulacion'

const AVISO =
  'La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad.'

type Fila =
  | { tipo: 'documento'; documento: DocumentoFirmado }
  | { tipo: 'lote'; numero: string; documentos: DocumentoFirmado[] }

/** Agrupa los certificados de cada lote en una fila, donde aparece el firmado más reciente. */
function agrupar(lista: DocumentoFirmado[]): Fila[] {
  const filas: Fila[] = []
  const lotes = new Map<string, DocumentoFirmado[]>()
  for (const d of lista) {
    if (!d.lote) filas.push({ tipo: 'documento', documento: d })
    else if (lotes.has(d.lote)) lotes.get(d.lote)!.push(d)
    else {
      const documentos = [d]
      lotes.set(d.lote, documentos)
      filas.push({ tipo: 'lote', numero: d.lote, documentos })
    }
  }
  return filas
}

const coincide = (d: DocumentoFirmado, filtro: string) =>
  `${d.codigo} ${d.nombres} ${d.apellidos} ${d.dni} ${d.lote ?? ''}`
    .toLowerCase()
    .includes(filtro.toLowerCase())

/**
 * HU29: Documentos firmados del Director, del más reciente al más antiguo, con "Anular" en cada
 * documento firmado (en un lote, en cada certificado). La búsqueda avanzada llega con HU22.
 */
export default function PaginaFirmados({ director = '' }: { director?: string }) {
  const [lista, setLista] = useState<DocumentoFirmado[] | null>(null)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [motivo, setMotivo] = useState<DocumentoFirmado | null>(null)
  const [anulando, setAnulando] = useState<DocumentoFirmado | null>(null)

  const cargar = useCallback(() => {
    firmados()
      .then(setLista)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la lista.'))
  }, [])
  useEffect(cargar, [cargar])

  const visibles = (lista ?? []).filter((d) => !filtro.trim() || coincide(d, filtro.trim()))
  const alternar = (numero: string) =>
    setAbiertos((a) => {
      const nuevos = new Set(a)
      if (nuevos.has(numero)) nuevos.delete(numero)
      else nuevos.add(numero)
      return nuevos
    })

  const accion = (d: DocumentoFirmado) =>
    d.reemisionEnCurso ? (
      <span className="text-sm text-amber-800">
        Reemisión en revisión: <span className="font-mono">{d.reemisionEnCurso}</span>. Se anulará
        al firmarla.
      </span>
    ) : d.estado === 'FIRMADO' ? (
      <button
        type="button"
        onClick={() => setMotivo(d)}
        aria-label={`Anular ${d.codigo}`}
        className={`${BOTON_ADVERTENCIA} px-3 py-1 text-sm`}
      >
        Anular
      </button>
    ) : d.motivoAnulacion ? (
      <span className="text-sm text-muted">Motivo: {d.motivoAnulacion}</span>
    ) : null

  const celdas = (d: DocumentoFirmado, sangria = false) => (
    <>
      <td className={`px-4 py-3 font-mono whitespace-nowrap ${sangria ? 'pl-10' : ''}`}>
        {d.codigo}
      </td>
      <td className="px-4 py-3">{d.tipoNombre}</td>
      <td className="px-4 py-3">
        {d.nombres} {d.apellidos}
        <span className="block text-sm text-muted">DNI {d.dni}</span>
      </td>
      <td className="px-4 py-3">{d.areaNombre}</td>
      <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(d.firmadoEn)}</td>
      <td className="px-4 py-3">
        <Estado estado={d.estado} />
      </td>
      <td className="px-4 py-3">{accion(d)}</td>
    </>
  )

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p className="text-muted">Documentos firmados, del más reciente al más antiguo.</p>
      <label className="mt-4 block max-w-md">
        <span className="sr-only">Buscar por nombre o código</span>
        <input
          type="search"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nombre o código"
          className="w-full rounded-lg border border-line bg-card px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : lista === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-card p-8 text-center shadow-sm">
          {lista.length === 0
            ? 'Todavía no hay documentos firmados.'
            : 'Ningún documento coincide.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código o lote</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Beneficiario(s)</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Fecha de firma</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agrupar(visibles).map((f) =>
                f.tipo === 'documento' ? (
                  <tr key={f.documento.codigo} className="border-b border-line last:border-0">
                    {celdas(f.documento)}
                  </tr>
                ) : (
                  <LoteFirmado
                    key={f.numero}
                    numero={f.numero}
                    documentos={f.documentos}
                    abierto={abiertos.has(f.numero) || !!filtro.trim()}
                    onAlternar={() => alternar(f.numero)}
                    celdas={celdas}
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {motivo && (
        <VentanaDeMotivo
          titulo="Anular documento"
          rechazo
          aviso={AVISO}
          onConfirmar={async (texto) => {
            await solicitarAnulacion(motivo.codigo, texto)
            setAnulando(motivo)
            setMotivo(null)
          }}
          onCerrar={() => setMotivo(null)}
        />
      )}
      {anulando && (
        <VentanaDeAnulacion
          documento={anulando}
          director={director}
          onCerrar={() => {
            setAnulando(null)
            cargar()
          }}
        />
      )}
    </section>
  )
}

function LoteFirmado({
  numero,
  documentos,
  abierto,
  onAlternar,
  celdas,
}: {
  numero: string
  documentos: DocumentoFirmado[]
  abierto: boolean
  onAlternar: () => void
  celdas: (d: DocumentoFirmado, sangria?: boolean) => React.ReactNode
}) {
  const primero = documentos[0]
  const anulados = documentos.filter((d) => d.estado === 'ANULADO').length
  return (
    <>
      <tr className="border-b border-line bg-cream/50">
        <td className="px-4 py-3 whitespace-nowrap">
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            className="font-medium text-institutional hover:underline"
          >
            {abierto ? '▾' : '▸'} ▤ Lote {numero}
          </button>
        </td>
        <td className="px-4 py-3">{primero.tipoNombre}</td>
        <td className="px-4 py-3">
          {primero.evento} · {documentos.length}{' '}
          {documentos.length === 1 ? 'certificado' : 'certificados'}
          {anulados > 0 && (
            <span className="block text-sm text-muted">
              {anulados === 1 ? '1 anulado' : `${anulados} anulados`}
            </span>
          )}
        </td>
        <td className="px-4 py-3">{primero.areaNombre}</td>
        <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(primero.firmadoEn)}</td>
        <td className="px-4 py-3" />
        <td className="px-4 py-3" />
      </tr>
      {abierto &&
        documentos.map((d) => (
          <tr key={d.codigo} className="border-b border-line last:border-0">
            {celdas(d, true)}
          </tr>
        ))}
    </>
  )
}
