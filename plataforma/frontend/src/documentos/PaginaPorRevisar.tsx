import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO } from '../comun/estilos'
import VentanaDeFirma, { type Seleccion } from '../firma/VentanaDeFirma'
import { fechaCorta } from './api'
import { bandeja, type ElementoPorRevisar } from './revision'

const clave = (e: ElementoPorRevisar) => (e.lote ? `lote:${e.lote}` : (e.codigo as string))

/**
 * HU10 (RF21): bandeja del Director, del más antiguo al más reciente; un lote es una fila.
 * HU11: los elementos revisados se seleccionan para firmarlos en una sola operación.
 */
export default function PaginaPorRevisar({ director = '' }: { director?: string }) {
  const [lista, setLista] = useState<ElementoPorRevisar[] | null>(null)
  const [error, setError] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [firmando, setFirmando] = useState<Seleccion | null>(null)

  const cargar = useCallback(() => {
    bandeja()
      .then((l) => {
        setLista(l)
        setElegidos(new Set())
      })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la bandeja.'))
  }, [])
  useEffect(cargar, [cargar])

  const alternar = (e: ElementoPorRevisar) =>
    setElegidos((previos) => {
      const nuevos = new Set(previos)
      if (nuevos.has(clave(e))) nuevos.delete(clave(e))
      else nuevos.add(clave(e))
      return nuevos
    })

  const seleccionados = (lista ?? []).filter((e) => elegidos.has(clave(e)))
  const certificados = seleccionados.reduce((total, e) => total + e.cantidad, 0)

  const firmarSeleccionados = () =>
    setFirmando({
      codigos: seleccionados.filter((e) => !e.lote).map((e) => e.codigo as string),
      lotes: seleccionados.filter((e) => e.lote).map((e) => e.lote as string),
      cantidad: certificados,
      nombres: Object.fromEntries(
        seleccionados
          .filter((e) => e.codigo)
          .map((e) => [e.codigo as string, `${e.tipoNombre} – ${e.beneficiario}`]),
      ),
    })

  return (
    <section className="mx-auto w-full max-w-6xl p-6 pb-24">
      <p className="text-muted">
        Documentos enviados por las áreas, del más antiguo al más reciente.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : lista === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-card p-8 text-center shadow-sm">
          <span className="block text-lg font-semibold text-institutional">¡Todo al día!</span>
          No tiene documentos pendientes de revisión.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="w-10 px-4 py-3 font-medium">
                  <span className="sr-only">Seleccionar</span>
                </th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Beneficiario(s)</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Enviado por</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Fecha de envío</th>
                <th className="px-4 py-3 font-medium">Revisión</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const nombre = e.lote
                  ? `Lote ${e.lote} · ${e.evento} · ${e.cantidad} certificados`
                  : (e.beneficiario ?? '')
                return (
                  <tr key={clave(e)} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${nombre}`}
                        title={
                          e.revisado ? undefined : 'Revise el documento antes de seleccionarlo.'
                        }
                        disabled={!e.revisado}
                        checked={elegidos.has(clave(e))}
                        onChange={() => alternar(e)}
                        className="h-4 w-4 accent-institutional disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3">{e.tipoNombre}</td>
                    <td className="px-4 py-3">
                      <a
                        href={e.lote ? `#/por-revisar/lote/${e.lote}` : `#/por-revisar/${e.codigo}`}
                        className="font-medium text-institutional hover:underline"
                      >
                        {e.lote ? `▤ ${nombre}` : nombre}
                      </a>
                      {e.numeroExpediente && (
                        <span className="block text-sm text-muted">{e.numeroExpediente}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{e.areaNombre}</td>
                    <td className="px-4 py-3">{e.enviadoPor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(e.registradoEn)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {e.revisado ? (
                        <span className="font-medium text-institutional">✓ Revisado</span>
                      ) : (
                        <span className="text-muted">Sin revisar</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {lista.some((e) => !e.revisado) && (
            <p className="border-t border-line px-4 py-2 text-sm text-muted">
              Revise el documento antes de seleccionarlo.
            </p>
          )}
        </div>
      )}

      {seleccionados.length > 0 && (
        <div
          role="region"
          aria-label="Selección para firmar"
          className="fixed inset-x-0 bottom-0 border-t border-line bg-card/95 shadow-lg md:left-64"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <span className="font-medium">
              {seleccionados.length} {seleccionados.length === 1 ? 'seleccionado' : 'seleccionados'}{' '}
              ({certificados} {certificados === 1 ? 'certificado' : 'certificados'})
            </span>
            <button type="button" onClick={firmarSeleccionados} className={BOTON_PRIMARIO}>
              Firmar seleccionados
            </button>
          </div>
        </div>
      )}

      {firmando && (
        <VentanaDeFirma
          seleccion={firmando}
          director={director}
          onCerrar={(resultado) => {
            setFirmando(null)
            if (resultado) cargar()
          }}
        />
      )}
    </section>
  )
}
