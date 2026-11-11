import { useEffect, useState } from 'react'
import Modal from '../comun/Modal'
import { BOTON_ADVERTENCIA, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import { fechaYHora } from '../consulta/api'
import {
  asignarTipo,
  consultarCatalogo,
  quitarTipo,
  type AreaConfigurada,
  type Catalogo,
  type TipoDeDocumento,
} from './api'

const ORIGEN: Record<TipoDeDocumento['origen'], string> = {
  SOLICITUD_PARTE: 'A solicitud de parte',
  OFICIO: 'De oficio, por lista',
}

const personas = (n: number) => (n === 1 ? '1 persona' : `${n} personas`)

interface Quitar {
  area: AreaConfigurada
  tipo: TipoDeDocumento
}

function TarjetaArea({
  area,
  tipos,
  onAsignar,
  onQuitar,
}: {
  area: AreaConfigurada
  tipos: TipoDeDocumento[]
  onAsignar: (tipo: string) => Promise<void>
  onQuitar: (tipo: TipoDeDocumento) => void
}) {
  const disponibles = tipos.filter((t) => !area.tipos.some((a) => a.codigo === t.codigo))
  const [elegido, setElegido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const idCampo = `asignar-${area.codigo}`

  const asignar = async () => {
    setEnviando(true)
    try {
      await onAsignar(elegido)
      setElegido('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <article
      aria-labelledby={`area-${area.codigo}`}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`area-${area.codigo}`} className="text-lg font-semibold">
          {area.nombre}
        </h2>
        <span className="text-sm text-muted">{personas(area.personasActivas)} del área</span>
      </header>

      {area.tipos.length === 0 ? (
        <p role="note" className="mt-3 rounded-lg bg-orange-pale px-3 py-2">
          Esta área no puede emitir documentos.
        </p>
      ) : (
        <ul className="mt-3 divide-y" aria-label={`Documentos que emite ${area.nombre}`}>
          {area.tipos.map((t) => (
            <li key={t.codigo} className="flex items-center justify-between gap-3 py-2">
              <span>
                {t.nombre}
                <span className="block text-sm text-muted">{ORIGEN[t.origen]}</span>
              </span>
              <button
                type="button"
                onClick={() => onQuitar(t)}
                aria-label={`Quitar ${t.nombre} de ${area.nombre}`}
                className="rounded px-2 py-0.5 font-medium text-red-700 hover:underline"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {disponibles.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label htmlFor={idCampo} className="min-w-64 flex-1 text-sm font-medium">
            Asignar otro tipo de documento
            <select
              id={idCampo}
              value={elegido}
              onChange={(e) => setElegido(e.target.value)}
              className={CAMPO}
            >
              <option value="">Elija un tipo de documento</option>
              {disponibles.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={asignar}
            disabled={!elegido || enviando}
            className={BOTON_SECUNDARIO}
          >
            Asignar
          </button>
        </div>
      )}
    </article>
  )
}

/**
 * DRA-60: el Administrador configura qué tipos de documento emite cada área (RF06). Quitar un tipo
 * solo impide registrar documentos nuevos de ese tipo; lo ya registrado sigue su trámite.
 */
export default function PaginaAreas() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [quitar, setQuitar] = useState<Quitar | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    consultarCatalogo()
      .then(setCatalogo)
      .catch((e: Error) => setError(e.message))
  }, [])

  const aplicar = async (accion: () => Promise<Catalogo>, mensaje: string) => {
    setError('')
    setAviso('')
    try {
      setCatalogo(await accion())
      setAviso(mensaje)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    }
  }

  const asignar = (area: AreaConfigurada) => async (codigo: string) => {
    const tipo = catalogo?.tipos.find((t) => t.codigo === codigo)
    await aplicar(
      () => asignarTipo(area.codigo, codigo),
      `${area.nombre} ya puede emitir ${tipo?.nombre ?? codigo}.`,
    )
  }

  const confirmarQuitar = async () => {
    if (!quitar) return
    setEnviando(true)
    await aplicar(
      () => quitarTipo(quitar.area.codigo, quitar.tipo.codigo),
      `${quitar.area.nombre} ya no emite ${quitar.tipo.nombre}.`,
    )
    setEnviando(false)
    setQuitar(null)
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <p className="text-muted">
        Qué tipos de documento puede emitir cada área. Los cambios rigen desde la siguiente pantalla
        de las personas del área.
      </p>

      {aviso && (
        <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
          ✓ {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {catalogo && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {catalogo.areas.map((a) => (
              <TarjetaArea
                key={a.codigo}
                area={a}
                tipos={catalogo.tipos}
                onAsignar={asignar(a)}
                onQuitar={(tipo) => setQuitar({ area: a, tipo })}
              />
            ))}
          </div>

          <section aria-labelledby="historial-catalogo" className="rounded-xl border bg-card p-5">
            <h2 id="historial-catalogo" className="font-semibold">
              Historial de cambios
            </h2>
            {catalogo.historial.length === 0 ? (
              <p className="mt-2 text-muted">Todavía no hay cambios.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {catalogo.historial.map((c, i) => (
                  <li key={i}>
                    {c.detalle}
                    <span className="block text-sm text-muted">
                      {fechaYHora(c.realizadoEn)} · {c.realizadoPor}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {quitar && (
        <Modal titulo="Quitar tipo de documento" onCerrar={() => setQuitar(null)}>
          <div className="space-y-4">
            <p>
              ¿Quitar <strong>«{quitar.tipo.nombre}»</strong> del{' '}
              <strong>{quitar.area.nombre}</strong>?
            </p>
            <p>
              {personas(quitar.area.personasActivas)} del área{' '}
              {quitar.area.personasActivas === 1 ? 'dejará' : 'dejarán'} de poder registrar
              documentos de este tipo. Los documentos ya registrados siguen su trámite.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setQuitar(null)} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarQuitar}
                disabled={enviando}
                className={BOTON_ADVERTENCIA}
              >
                Quitar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
