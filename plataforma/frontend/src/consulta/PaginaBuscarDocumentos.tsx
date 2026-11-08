import { Fragment, useEffect, useRef, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { CAMPO } from '../comun/estilos'
import { fechaCorta, type EstadoDocumento } from '../documentos/api'
import Estado from '../documentos/Estado'
import {
  buscarDocumentos,
  FILTROS,
  MAXIMO_DE_FILAS,
  MINIMO_DE_CARACTERES,
  type FilaDeBusqueda,
  type FiltroDeEstado,
  type ResultadoDeBusqueda,
} from './api'

/** Espera después de la última tecla, para no consultar en cada una. */
export const ESPERA_MS = 300

const CELDA = 'px-4 py-3'

const certificados = (n: number) => (n === 1 ? '1 certificado' : `${n} certificados`)

/**
 * HU22 (RF42): Mesa de Partes busca documentos de todas las áreas por nombre, DNI, código de
 * verificación, número de expediente o número de lote. Los certificados de un lote van dentro de
 * la fila del lote.
 */
export default function PaginaBuscarDocumentos() {
  const [texto, setTexto] = useState('')
  const [filtro, setFiltro] = useState<FiltroDeEstado>('TODOS')
  const [resultado, setResultado] = useState<ResultadoDeBusqueda | null>(null)
  const [buscado, setBuscado] = useState('')
  const [error, setError] = useState('')
  const consulta = useRef(0)

  const limpio = texto.trim().replace(/\s+/g, ' ')
  const muyCorto = limpio !== '' && limpio.replace(/ /g, '').length < MINIMO_DE_CARACTERES

  useEffect(() => {
    if (muyCorto) return
    const numero = ++consulta.current
    const espera = setTimeout(() => {
      buscarDocumentos(limpio, filtro)
        .then((r) => {
          // Solo se muestra la respuesta de la última búsqueda.
          if (numero !== consulta.current) return
          setResultado(r)
          setBuscado(limpio)
          setError('')
        })
        .catch((e) => {
          if (numero !== consulta.current) return
          setError(e instanceof ErrorApi ? e.message : 'No se pudo buscar. Intente nuevamente.')
        })
    }, ESPERA_MS)
    return () => clearTimeout(espera)
  }, [limpio, filtro, muyCorto])

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <label className="block">
        <span className="font-medium">Buscar</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, DNI, código de verificación, N.° de expediente o lote"
          aria-describedby="ayuda-busqueda"
          className={`${CAMPO} border-line`}
        />
      </label>
      <p id="ayuda-busqueda" className="mt-1 text-sm text-muted">
        {muyCorto ? (
          <span role="alert" className="text-red-800">
            Escriba al menos {MINIMO_DE_CARACTERES} caracteres.
          </span>
        ) : (
          'Puede escribir solo una parte del nombre o del código.'
        )}
      </p>

      <div role="tablist" aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            role="tab"
            aria-selected={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-4 py-1 text-sm font-medium ${
              filtro === f.valor
                ? 'border-institutional bg-institutional text-white'
                : 'border-line bg-card text-ink hover:bg-green-pale'
            }`}
          >
            {f.titulo}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : resultado === null ? (
        <p className="mt-4 text-muted">Buscando…</p>
      ) : resultado.filas.length === 0 ? (
        <p role="status" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {buscado
            ? `No se encontraron documentos con «${buscado}». Revise lo que escribió o busque por otro dato.`
            : 'No hay documentos con este estado.'}
        </p>
      ) : (
        <>
          {resultado.hayMas && (
            <p role="status" className="mt-4 rounded-xl bg-amber-pale p-4 text-ink">
              Se muestran los {MAXIMO_DE_FILAS} resultados más recientes. Escriba más datos para
              precisar la búsqueda.
            </p>
          )}
          <Resultados key={`${buscado}|${filtro}`} filas={resultado.filas} />
        </>
      )}
    </section>
  )
}

function Resultados({ filas }: { filas: FilaDeBusqueda[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
      <table className="w-full text-left">
        <thead className="border-b border-line text-sm text-muted">
          <tr>
            <th className={`${CELDA} font-medium`}>Código o lote</th>
            <th className={`${CELDA} font-medium`}>Tipo</th>
            <th className={`${CELDA} font-medium`}>Beneficiario</th>
            <th className={`${CELDA} font-medium`}>DNI</th>
            <th className={`${CELDA} font-medium`}>N.° de expediente</th>
            <th className={`${CELDA} font-medium`}>Área</th>
            <th className={`${CELDA} font-medium`}>Fecha de envío</th>
            <th className={`${CELDA} font-medium`}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) =>
            f.lote && f.certificados ? (
              <FilaLote key={`lote-${f.lote}`} fila={f} />
            ) : (
              <FilaDocumento key={f.codigo} fila={f} />
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function FilaDocumento({ fila, enLote = false }: { fila: FilaDeBusqueda; enLote?: boolean }) {
  return (
    <tr className={`border-b border-line last:border-0 ${enLote ? 'bg-cream' : ''}`}>
      <td className={`${CELDA} font-mono whitespace-nowrap ${enLote ? 'pl-12' : ''}`}>
        {fila.codigo}
      </td>
      <td className={CELDA}>{fila.tipoNombre}</td>
      <td className={CELDA}>{fila.beneficiario}</td>
      <td className={`${CELDA} font-mono`}>{fila.dni}</td>
      <td className={`${CELDA} whitespace-nowrap`}>{fila.numeroExpediente ?? '—'}</td>
      <td className={CELDA}>{fila.areaNombre}</td>
      <td className={`${CELDA} whitespace-nowrap`}>{fechaCorta(fila.registradoEn)}</td>
      <td className={CELDA}>{fila.estado && <Estado estado={fila.estado} />}</td>
    </tr>
  )
}

/** Un lote en una fila, que se despliega en sus certificados. */
function FilaLote({ fila }: { fila: FilaDeBusqueda }) {
  const lista = fila.certificados ?? []
  // Si la búsqueda coincide solo con algunos certificados, el lote aparece desplegado.
  const [abierto, setAbierto] = useState(!fila.completo)
  const conteo = new Map<EstadoDocumento, number>()
  lista.forEach((c) => c.estado && conteo.set(c.estado, (conteo.get(c.estado) ?? 0) + 1))
  return (
    <Fragment>
      <tr className="border-b border-line last:border-0">
        <td className={`${CELDA} whitespace-nowrap`}>
          <button
            type="button"
            onClick={() => setAbierto(!abierto)}
            aria-expanded={abierto}
            className="font-mono text-institutional hover:underline"
          >
            <span aria-hidden="true">{abierto ? '▾' : '▸'} </span>
            Lote {fila.lote}
          </button>
        </td>
        <td className={CELDA}>{fila.tipoNombre}</td>
        <td className={CELDA}>
          {certificados(fila.cantidad ?? lista.length)}
          {!fila.completo && (
            <span className="block text-sm text-muted">
              {lista.length} de {fila.cantidad} coinciden con la búsqueda
            </span>
          )}
        </td>
        <td className={CELDA}>—</td>
        <td className={CELDA}>—</td>
        <td className={CELDA}>{fila.areaNombre}</td>
        <td className={`${CELDA} whitespace-nowrap`}>{fechaCorta(fila.registradoEn)}</td>
        <td className={CELDA}>
          <span className="flex flex-wrap gap-1">
            {[...conteo].map(([estado, n]) => (
              <Estado key={estado} estado={estado} cantidad={conteo.size > 1 ? n : undefined} />
            ))}
          </span>
        </td>
      </tr>
      {abierto && lista.map((c) => <FilaDocumento key={c.codigo} fila={c} enLote />)}
    </Fragment>
  )
}
