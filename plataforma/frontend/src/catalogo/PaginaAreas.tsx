import { useEffect, useState } from 'react'
import Modal from '../comun/Modal'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import { fechaYHora } from '../consulta/api'
import {
  asignarTipo,
  consultarCatalogo,
  crearArea,
  deshabilitarArea,
  quitarTipo,
  reactivarArea,
  renombrarArea,
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

/** DRA-61: la ventana abierta para crear, renombrar, deshabilitar o reactivar un área. */
type AccionArea =
  | { tipo: 'crear' }
  | { tipo: 'renombrar'; area: AreaConfigurada }
  | { tipo: 'deshabilitar'; area: AreaConfigurada }
  | { tipo: 'reactivar'; area: AreaConfigurada }

const TITULOS: Record<AccionArea['tipo'], string> = {
  crear: 'Nueva área',
  renombrar: 'Cambiar el nombre del área',
  deshabilitar: 'Deshabilitar área',
  reactivar: 'Reactivar área',
}

/** DRA-61: crear, renombrar, deshabilitar o reactivar un área, con su error dentro de la ventana. */
function VentanaArea({
  accion,
  onConfirmar,
  onCerrar,
}: {
  accion: AccionArea
  onConfirmar: (nombre: string) => Promise<void>
  onCerrar: () => void
}) {
  const conNombre = accion.tipo === 'crear' || accion.tipo === 'renombrar'
  const [nombre, setNombre] = useState(accion.tipo === 'renombrar' ? accion.area.nombre : '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await onConfirmar(nombre)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
      setEnviando(false)
    }
  }

  const boton = {
    crear: 'Crear área',
    renombrar: 'Guardar nombre',
    deshabilitar: 'Deshabilitar',
    reactivar: 'Reactivar',
  }[accion.tipo]

  return (
    <Modal titulo={TITULOS[accion.tipo]} onCerrar={onCerrar}>
      <form onSubmit={confirmar} className="space-y-4" noValidate>
        {conNombre && (
          <div>
            <label className="block text-sm font-medium">
              Nombre del área
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={100}
                autoFocus
                aria-describedby="ayuda-nombre-area"
                className={CAMPO}
              />
            </label>
            <p id="ayuda-nombre-area" className="mt-1 text-sm text-muted">
              De 3 a 100 caracteres. No puede repetirse.
            </p>
          </div>
        )}
        {accion.tipo === 'crear' && (
          <p>El área se crea activa y sin tipos de documento: asígnelos después en su tarjeta.</p>
        )}
        {accion.tipo === 'renombrar' && (
          <p>
            El nombre nuevo se verá en toda la plataforma. Los documentos ya emitidos no cambian.
          </p>
        )}
        {accion.tipo === 'deshabilitar' && (
          <>
            <p>
              ¿Deshabilitar <strong>«{accion.area.nombre}»</strong>?
            </p>
            <p>
              No aparecerá al crear cuentas y no se podrán registrar documentos nuevos en ella. Sus
              documentos en trámite siguen su flujo y los firmados siguen siendo válidos.
            </p>
          </>
        )}
        {accion.tipo === 'reactivar' && (
          <p>
            ¿Reactivar <strong>«{accion.area.nombre}»</strong>? Vuelve con los tipos de documento
            que tenía.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className={accion.tipo === 'deshabilitar' ? BOTON_ADVERTENCIA : BOTON_PRIMARIO}
          >
            {boton}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TarjetaArea({
  area,
  tipos,
  onAsignar,
  onQuitar,
  onAccion,
}: {
  area: AreaConfigurada
  tipos: TipoDeDocumento[]
  onAsignar: (tipo: string) => Promise<void>
  onQuitar: (tipo: TipoDeDocumento) => void
  onAccion: (accion: AccionArea) => void
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
      <div className="mt-1 flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => onAccion({ tipo: 'renombrar', area })}
          aria-label={`Cambiar el nombre de ${area.nombre}`}
          className="font-medium text-institutional hover:underline"
        >
          Cambiar nombre
        </button>
        <button
          type="button"
          onClick={() => onAccion({ tipo: 'deshabilitar', area })}
          aria-label={`Deshabilitar ${area.nombre}`}
          className="font-medium text-red-700 hover:underline"
        >
          Deshabilitar
        </button>
      </div>

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
 *
 * DRA-61: también crea, renombra, deshabilita y reactiva áreas. No hay opción para eliminarlas.
 */
export default function PaginaAreas() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [quitar, setQuitar] = useState<Quitar | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [accion, setAccion] = useState<AccionArea | null>(null)

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

  /** La ventana muestra el error; si todo sale bien, se cierra con el aviso. */
  const confirmarAccion = async (nombre: string) => {
    if (!accion) return
    setError('')
    setAviso('')
    const nombreLimpio = nombre.trim().replace(/\s+/g, ' ')
    const [peticion, mensaje] =
      accion.tipo === 'crear'
        ? [
            () => crearArea(nombre),
            `Se creó el área «${nombreLimpio}». Asígnele sus tipos de documento.`,
          ]
        : accion.tipo === 'renombrar'
          ? [
              () => renombrarArea(accion.area.codigo, nombre),
              `«${accion.area.nombre}» ahora se llama «${nombreLimpio}».`,
            ]
          : accion.tipo === 'deshabilitar'
            ? [
                () => deshabilitarArea(accion.area.codigo),
                `Se deshabilitó «${accion.area.nombre}».`,
              ]
            : [() => reactivarArea(accion.area.codigo), `Se reactivó «${accion.area.nombre}».`]
    setCatalogo(await peticion())
    setAviso(mensaje)
    setAccion(null)
  }

  const activas = catalogo?.areas.filter((a) => a.activa) ?? []
  const deshabilitadas = catalogo?.areas.filter((a) => !a.activa) ?? []

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">
          Qué tipos de documento puede emitir cada área. Los cambios rigen desde la siguiente
          pantalla de las personas del área.
        </p>
        <button
          type="button"
          onClick={() => setAccion({ tipo: 'crear' })}
          className={BOTON_PRIMARIO}
        >
          Nueva área
        </button>
      </div>

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
            {activas.map((a) => (
              <TarjetaArea
                key={a.codigo}
                area={a}
                tipos={catalogo.tipos}
                onAsignar={asignar(a)}
                onQuitar={(tipo) => setQuitar({ area: a, tipo })}
                onAccion={setAccion}
              />
            ))}
          </div>

          {deshabilitadas.length > 0 && (
            <section aria-labelledby="areas-deshabilitadas" className="space-y-3">
              <h2 id="areas-deshabilitadas" className="font-semibold">
                Áreas deshabilitadas
              </h2>
              <p className="text-muted">
                No aparecen al crear cuentas y no registran documentos nuevos. Sus documentos
                firmados siguen siendo válidos.
              </p>
              <ul className="divide-y rounded-xl border bg-card">
                {deshabilitadas.map((a) => (
                  <li
                    key={a.codigo}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <span>
                      <span className="font-medium">{a.nombre}</span>
                      <span className="block text-sm text-muted">
                        {a.tipos.length === 0
                          ? 'Sin tipos de documento'
                          : `Conserva: ${a.tipos.map((t) => t.nombre).join(', ')}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAccion({ tipo: 'reactivar', area: a })}
                      aria-label={`Reactivar ${a.nombre}`}
                      className={BOTON_SECUNDARIO}
                    >
                      Reactivar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

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

      {accion && (
        <VentanaArea
          accion={accion}
          onConfirmar={confirmarAccion}
          onCerrar={() => setAccion(null)}
        />
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
