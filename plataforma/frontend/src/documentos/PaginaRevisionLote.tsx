import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import VentanaDeFirma from '../firma/VentanaDeFirma'
import { fechaCorta, type Lote } from './api'
import Certificado from './Certificado'
import Estado from './Estado'
import MuestraDelPdf from './MuestraDelPdf'
import { decidirEnLote, revisarLote } from './revision'
import VentanaDeMotivo from './VentanaDeMotivo'

type Decision = { tipo: 'observacion' | 'rechazo'; seleccionados: boolean }

const TITULOS: Record<string, string> = {
  'observacion-true': 'Observar beneficiarios seleccionados',
  'observacion-false': 'Observar lote',
  'rechazo-true': 'Rechazar beneficiarios seleccionados',
  'rechazo-false': 'Rechazar lote',
}

const contar = (n: number, singular: string, plural: string) =>
  n === 1 ? `1 ${singular}` : `${n} ${plural}`

/**
 * HU10: revisión de un lote. A la izquierda, el certificado del beneficiario elegido; a la derecha,
 * la relación. Abrir el lote cuenta como revisión de todos sus documentos (RF22).
 * HU12: se observan o rechazan certificados (algunos o todos) y se firma el resto.
 */
export default function PaginaRevisionLote({
  numero,
  director = '',
}: {
  numero: string
  director?: string
}) {
  const [lote, setLote] = useState<Lote | null>(null)
  const [error, setError] = useState('')
  const [actual, setActual] = useState(0)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [decision, setDecision] = useState<Decision | null>(null)
  const [aviso, setAviso] = useState('')
  const [firmando, setFirmando] = useState(false)
  useEffect(() => {
    revisarLote(numero)
      .then(setLote)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el lote.'))
  }, [numero])

  const total = lote?.documentos.length ?? 0
  const elegido = lote?.documentos[actual]
  const pendientes = lote?.documentos.filter((d) => d.estado === 'PENDIENTE') ?? []
  const cuantos = (estado: string) =>
    lote?.documentos.filter((d) => d.estado === estado).length ?? 0

  const alternar = (codigo: string) =>
    setMarcados((previos) => {
      const nuevos = new Set(previos)
      if (nuevos.has(codigo)) nuevos.delete(codigo)
      else nuevos.add(codigo)
      return nuevos
    })

  const decidir = async (motivo: string) => {
    if (!decision || !lote) return
    const codigos = decision.seleccionados ? [...marcados] : []
    const afectados = decision.seleccionados ? codigos.length : pendientes.length
    const actualizado = await decidirEnLote(numero, decision.tipo, codigos, motivo)
    setLote(actualizado)
    setMarcados(new Set())
    setDecision(null)
    const unidad = contar(afectados, 'certificado', 'certificados')
    setAviso(
      decision.tipo === 'observacion'
        ? `${unidad} ${afectados === 1 ? 'fue observado y volvió' : 'fueron observados y volvieron'} al área.`
        : `${unidad} ${afectados === 1 ? 'fue rechazado' : 'fueron rechazados'}.`,
    )
  }

  const notas = () => {
    const observados = cuantos('OBSERVADO')
    const rechazados = cuantos('RECHAZADO')
    return [
      ...(observados
        ? [
            `${contar(observados, 'certificado', 'certificados')} ${observados === 1 ? 'fue observado y devuelto' : 'fueron observados y devueltos'} al área.`,
          ]
        : []),
      ...(rechazados
        ? [
            `${contar(rechazados, 'certificado', 'certificados')} ${rechazados === 1 ? 'fue rechazado' : 'fueron rechazados'}.`,
          ]
        : []),
    ]
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
        ← Volver a Por revisar
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : lote === null || !elegido ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold">Revisión de lote – Lote {lote.numero}</h2>
          <p className="mt-2 rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
            <strong>{lote.tipoNombre}</strong> · {lote.datos.nombreEvento} · {lote.periodo}
            {lote.datos.lugar && ` · ${lote.datos.lugar}`}
            <span className="block text-sm text-muted">
              Enviado por {lote.registradoPor} ({lote.areaNombre}) el{' '}
              {fechaCorta(lote.registradoEn)}
            </span>
          </p>
          {aviso && (
            <p role="status" className="mt-4 rounded-lg bg-green-pale px-4 py-3 text-institutional">
              {aviso}
            </p>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div>
              <Certificado
                documento={{
                  ...lote.ejemplo,
                  nombres: elegido.nombres,
                  apellidos: elegido.apellidos,
                  dni: elegido.dni,
                }}
              />
              {elegido.estado === 'PENDIENTE' ? (
                <MuestraDelPdf codigo={elegido.codigo} />
              ) : (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Estado estado={elegido.estado} />
                  {elegido.motivo && <span className="text-muted">Motivo: {elegido.motivo}</span>}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded px-3 py-2 font-medium text-institutional hover:bg-green-pale disabled:opacity-40"
                  disabled={actual === 0}
                  onClick={() => setActual((i) => i - 1)}
                >
                  ‹ Anterior
                </button>
                <span className="text-sm text-muted">
                  Certificado {actual + 1} de {total}
                </span>
                <button
                  type="button"
                  className="rounded px-3 py-2 font-medium text-institutional hover:bg-green-pale disabled:opacity-40"
                  disabled={actual === total - 1}
                  onClick={() => setActual((i) => i + 1)}
                >
                  Siguiente ›
                </button>
              </div>
            </div>
            <aside
              aria-label="Beneficiarios del lote"
              className="rounded-xl border border-line bg-card shadow-sm"
            >
              <h3 className="border-b border-line p-3 font-semibold">Beneficiarios ({total})</h3>
              <ol className="max-h-[28rem] overflow-y-auto">
                {lote.documentos.map((d, i) => {
                  const nombre = `${d.nombres} ${d.apellidos}`
                  return (
                    <li
                      key={d.codigo}
                      className={`flex items-center gap-2 border-b border-line pl-3 last:border-0 ${i === actual ? 'bg-green-pale' : ''}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Marcar a ${nombre}`}
                        disabled={d.estado !== 'PENDIENTE'}
                        checked={marcados.has(d.codigo)}
                        onChange={() => alternar(d.codigo)}
                        className="h-4 w-4 shrink-0 accent-institutional disabled:invisible"
                      />
                      <button
                        type="button"
                        aria-pressed={i === actual}
                        onClick={() => setActual(i)}
                        className={`flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pr-3 text-left hover:text-institutional ${i === actual ? 'font-semibold text-institutional' : ''}`}
                      >
                        <span>
                          {i + 1}. {nombre}
                          <span className="block text-sm font-normal text-muted">{d.dni}</span>
                          {d.reemision && (
                            <span className="block text-sm font-normal text-blue">
                              ↻ Reemisión de {d.reemision.original}:{' '}
                              {d.reemision.cambios.join('; ')}
                            </span>
                          )}
                        </span>
                        {d.estado !== 'PENDIENTE' && <Estado estado={d.estado} />}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </aside>
          </div>

          {pendientes.length === 0 ? (
            <p className="mt-6 rounded-lg bg-neutral-pale px-4 py-3">
              El lote ya no tiene certificados pendientes.{' '}
              <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
                Volver a Por revisar
              </a>
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted">
                ✓ El lote quedó registrado como revisado: cuenta para sus{' '}
                {contar(pendientes.length, 'certificado pendiente', 'certificados pendientes')}.
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDecision({ tipo: 'rechazo', seleccionados: false })}
                  className={BOTON_ADVERTENCIA}
                >
                  Rechazar lote
                </button>
                <button
                  type="button"
                  onClick={() => setDecision({ tipo: 'observacion', seleccionados: false })}
                  className={BOTON_SECUNDARIO}
                >
                  Observar lote
                </button>
                <button
                  type="button"
                  disabled={marcados.size === 0}
                  onClick={() => setDecision({ tipo: 'rechazo', seleccionados: true })}
                  className={BOTON_SECUNDARIO}
                >
                  Rechazar seleccionados
                </button>
                <button
                  type="button"
                  disabled={marcados.size === 0}
                  onClick={() => setDecision({ tipo: 'observacion', seleccionados: true })}
                  className={BOTON_SECUNDARIO}
                >
                  Observar seleccionados
                </button>
                <button type="button" onClick={() => setFirmando(true)} className={BOTON_PRIMARIO}>
                  Firmar lote
                </button>
              </div>
            </>
          )}

          {decision && (
            <VentanaDeMotivo
              titulo={TITULOS[`${decision.tipo}-${decision.seleccionados}`]}
              rechazo={decision.tipo === 'rechazo'}
              onConfirmar={decidir}
              onCerrar={() => setDecision(null)}
            />
          )}
          {firmando && (
            <VentanaDeFirma
              seleccion={{
                codigos: [],
                lotes: [lote.numero],
                cantidad: pendientes.length,
                unidad: 'certificado',
                notas: notas(),
                nombres: Object.fromEntries(
                  lote.documentos.map((d) => [d.codigo, `${d.nombres} ${d.apellidos}`]),
                ),
              }}
              director={director}
              onCerrar={(resultado) => {
                setFirmando(false)
                if (resultado) window.location.hash = '#/por-revisar'
              }}
            />
          )}
        </>
      )}
    </section>
  )
}
