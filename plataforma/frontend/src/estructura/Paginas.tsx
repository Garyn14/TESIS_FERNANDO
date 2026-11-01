import { useEffect, useState } from 'react'
import { tiposPermitidos, type TipoDocumento } from '../documentos/api'
import type { Sesion } from '../sesion/api'

const saludo = (hora: number) =>
  hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

export function PaginaInicio({ sesion }: { sesion: Sesion }) {
  const nombre = sesion.nombreCompleto.split(/\s+/).find((p) => !/\.$/.test(p)) ?? ''
  const [hola] = useState(() => saludo(new Date().getHours()))
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <h2 className="text-xl font-semibold">
        {hola}, {nombre}
      </h2>
      <p className="mt-1 text-muted">Ingresó como {sesion.rolNombre}.</p>
      {sesion.permisos.includes('DOCUMENTO_REGISTRAR') && <TiposDeMiArea sesion={sesion} />}
    </section>
  )
}

/** HU05 (RF05, RF06): tipos de documento que puede emitir el área de la persona. */
function TiposDeMiArea({ sesion }: { sesion: Sesion }) {
  const [tipos, setTipos] = useState<TipoDocumento[] | null>(null)
  useEffect(() => {
    tiposPermitidos()
      .then(setTipos)
      .catch(() => setTipos([]))
  }, [])

  if (tipos === null) return null
  if (tipos.length === 0)
    return (
      <p role="alert" className="mt-6 rounded-xl bg-orange-pale p-4 text-ink">
        ⚠ Su cuenta no tiene un área asignada, por eso todavía no puede emitir documentos.
        Comuníquese con el Administrador.
      </p>
    )
  return (
    <div className="mt-6 rounded-xl border border-line bg-card p-6 shadow-sm">
      <h3 className="font-semibold">Documentos que emite {sesion.areaNombre ?? 'su área'}</h3>
      <ul className="mt-3 space-y-2">
        {tipos.map((t) => (
          <li key={t.codigo} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-institutional">
              ✓
            </span>
            {t.nombre}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PaginaPendiente({ mensaje }: { mensaje: string }) {
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p className="rounded-xl border border-line bg-card p-6 text-muted shadow-sm">
        Esta sección todavía no está disponible. {mensaje}
      </p>
    </section>
  )
}

export function PaginaSinPermiso() {
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p role="alert" className="rounded-xl border border-line bg-card p-6 shadow-sm">
        No tiene permiso para ver esta sección.
      </p>
    </section>
  )
}
