import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { tiposPermitidos, type TipoDocumento } from './api'

const ORIGEN: Record<TipoDocumento['origen'], string> = {
  SOLICITUD_PARTE: 'A solicitud de parte',
  OFICIO: 'Emisión por lista',
}

/** HU07 (RF10): selección del tipo de documento, entre los asignados al área de la persona. */
export default function PaginaNuevoDocumento() {
  const [tipos, setTipos] = useState<TipoDocumento[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    tiposPermitidos()
      .then(setTipos)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los tipos.'),
      )
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      {error ? (
        <p role="alert" className="rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : tipos === null ? (
        <p className="text-muted">Cargando…</p>
      ) : tipos.length === 0 ? (
        <p role="alert" className="rounded-xl bg-orange-pale p-4 text-ink">
          ⚠ Su cuenta no tiene un área asignada, por eso todavía no puede emitir documentos.
          Comuníquese con el Administrador.
        </p>
      ) : (
        <>
          <p className="text-muted">Seleccione el tipo de documento que desea emitir</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {tipos.map((t) => (
              <li key={t.codigo}>
                <a
                  href={`#/nuevo-documento/${t.codigo}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-card p-6 shadow-sm hover:border-institutional-soft hover:shadow"
                >
                  <span className="flex items-start justify-between">
                    <Icono origen={t.origen} />
                    <span aria-hidden="true" className="text-institutional">
                      ›
                    </span>
                  </span>
                  <span className="mt-4 text-lg font-semibold">{t.nombre}</span>
                  <span className="mt-2 text-muted">{t.descripcion}</span>
                  <span className="mt-4 w-fit rounded-full bg-green-pale px-3 py-1 text-sm font-medium text-institutional">
                    {ORIGEN[t.origen]}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted">
            Solo se muestran los tipos de documento asignados a su área.
          </p>
        </>
      )}
    </section>
  )
}

/** Un documento para el registro individual y un grupo de personas para la emisión por lista. */
function Icono({ origen }: { origen: TipoDocumento['origen'] }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-pale text-institutional"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        {origen === 'OFICIO' ? (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M16 14.2c2.8.3 5 2 5 4.8" />
          </>
        ) : (
          <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v4h4M10 12h5M10 16h5" />
          </>
        )}
      </svg>
    </span>
  )
}
