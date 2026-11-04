import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { fechaCorta, lote as consultar, type Lote } from './api'
import Certificado from './Certificado'
import CorregirBeneficiario from './CorregirBeneficiario'
import Estado from './Estado'

/** Datos del evento que se muestran en el detalle, con su etiqueta. */
const DATOS_DEL_EVENTO: [string, string][] = [
  ['nombreEvento', 'Evento'],
  ['motivo', 'Motivo'],
  ['lugar', 'Lugar'],
  ['duracionHoras', 'Duración (horas)'],
  ['areaOrganizadora', 'Área organizadora'],
]

/**
 * HU09: detalle de un lote del área: los datos del evento, el certificado de ejemplo y sus
 * documentos. Nada se puede modificar mientras estén Pendientes (RF20).
 */
export default function PaginaDetalleLote({ numero }: { numero: string }) {
  const [datos, setDatos] = useState<Lote | null>(null)
  const [error, setError] = useState('')
  const [corrigiendo, setCorrigiendo] = useState<Lote['documentos'][number] | null>(null)
  const [aviso, setAviso] = useState('')
  const [reemitiendo, setReemitiendo] = useState<Lote['documentos'][number] | null>(null)
  const cargar = () =>
    consultar(numero)
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el lote.'))
  useEffect(() => {
    consultar(numero)
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el lote.'))
  }, [numero])

  const filas: [string, string][] = datos
    ? [
        ['Tipo', datos.tipoNombre],
        ...DATOS_DEL_EVENTO.filter(([clave]) => datos.datos[clave]).map(
          ([clave, etiqueta]): [string, string] => [etiqueta, datos.datos[clave]],
        ),
        ['Fecha del evento', datos.periodo],
        ['Área', datos.areaNombre],
        ['Enviado por', datos.registradoPor],
        ['Fecha de envío', fechaCorta(datos.registradoEn)],
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
      ) : datos === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          {aviso && (
            <p role="status" className="mt-4 rounded-lg bg-green-pale px-4 py-3 text-institutional">
              {aviso}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Lote {datos.numero}</h2>
            {[...new Set(datos.documentos.map((d) => d.estado))].map((e) => (
              <Estado
                key={e}
                estado={e}
                cantidad={
                  new Set(datos.documentos.map((d) => d.estado)).size > 1
                    ? datos.documentos.filter((d) => d.estado === e).length
                    : undefined
                }
              />
            ))}
          </div>
          <p className="mt-1 text-muted">
            {datos.documentos.every((d) => d.estado === 'FIRMADO')
              ? `${datos.documentos.length} certificados firmados por el Director y registrados en la blockchain.`
              : datos.documentos.every((d) => d.estado === 'PENDIENTE')
                ? `${datos.documentos.length} certificados en revisión del Director: no se pueden modificar mientras estén Pendientes.`
                : `${datos.documentos.length} certificados. El estado de cada uno se muestra en la tabla.`}
          </p>
          <dl className="mt-4 grid rounded-xl border border-line bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {filas.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="border-b border-line p-4">
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-6">
            <Certificado documento={datos.ejemplo} />
            <div className="overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <caption className="p-3 text-left font-semibold">Certificados del lote</caption>
                <thead className="border-y border-line text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">N.°</th>
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Beneficiario</th>
                    <th className="px-3 py-2 font-medium">DNI</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.documentos.map((d, i) => (
                    <tr key={d.codigo} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-muted">{i + 1}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        <a
                          href={`#/mis-documentos/${d.codigo}`}
                          className="text-institutional hover:underline"
                        >
                          {d.codigo}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        {d.nombres} {d.apellidos}
                      </td>
                      <td className="px-3 py-2">{d.dni}</td>
                      <td className="px-3 py-2">
                        <Estado estado={d.estado} />
                        {d.motivo && (
                          <span className="mt-1 block text-muted">Motivo: {d.motivo}</span>
                        )}
                        {d.estado === 'OBSERVADO' && (
                          <button
                            type="button"
                            onClick={() => setCorrigiendo(d)}
                            className="mt-1 block font-medium text-institutional hover:underline"
                          >
                            Corregir
                          </button>
                        )}
                        {d.reemision && (
                          <span className="mt-1 block text-muted">
                            Reemisión de <span className="font-mono">{d.reemision.original}</span>
                          </span>
                        )}
                        {d.reemplazadoPor && (
                          <span className="mt-1 block text-muted">
                            Reemplazado por <span className="font-mono">{d.reemplazadoPor}</span>
                          </span>
                        )}
                        {d.reemisionEnCurso ? (
                          <span className="mt-1 block font-medium text-amber-800">
                            Reemisión en revisión:{' '}
                            <span className="font-mono">{d.reemisionEnCurso}</span>
                          </span>
                        ) : (
                          d.estado === 'FIRMADO' && (
                            <button
                              type="button"
                              onClick={() => setReemitiendo(d)}
                              aria-label={`Reemitir con corrección ${d.codigo}`}
                              className="mt-1 block font-medium text-institutional hover:underline"
                            >
                              ↻ Reemitir con corrección
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {corrigiendo && (
            <CorregirBeneficiario
              codigo={corrigiendo.codigo}
              beneficiario={{
                nombres: corrigiendo.nombres,
                apellidos: corrigiendo.apellidos,
                dni: corrigiendo.dni,
              }}
              motivo={corrigiendo.motivo ?? ''}
              onCorregido={() => {
                setAviso(
                  `✓ El certificado de ${corrigiendo.nombres} ${corrigiendo.apellidos} se corrigió y se reenvió a revisión.`,
                )
                setCorrigiendo(null)
                void cargar()
              }}
              onCerrar={() => setCorrigiendo(null)}
            />
          )}
          {reemitiendo && (
            <CorregirBeneficiario
              reemision
              codigo={reemitiendo.codigo}
              beneficiario={{
                nombres: reemitiendo.nombres,
                apellidos: reemitiendo.apellidos,
                dni: reemitiendo.dni,
              }}
              motivo=""
              onCorregido={(nuevo) => {
                setAviso(
                  `✓ La reemisión de ${reemitiendo.codigo} se envió a revisión con el código ${nuevo}.`,
                )
                setReemitiendo(null)
                void cargar()
              }}
              onCerrar={() => setReemitiendo(null)}
            />
          )}
        </>
      )}
    </section>
  )
}
