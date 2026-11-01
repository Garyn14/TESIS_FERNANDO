import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { tipoPermitido, type TipoDocumento } from './api'
import FormularioLote from './FormularioLote'
import FormularioSolicitud from './FormularioSolicitud'

/**
 * HU07: formulario del tipo elegido. Los de oficio abren el registro por lista (HU09) y los de
 * solicitud de parte, el registro individual (HU08). El servidor confirma que el tipo sea del área.
 */
export default function PaginaFormularioDocumento({
  codigo,
  areaNombre,
}: {
  codigo: string
  areaNombre: string | null
}) {
  const [tipo, setTipo] = useState<TipoDocumento | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    tipoPermitido(codigo)
      .then(setTipo)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el tipo de documento.'),
      )
  }, [codigo])

  const porLista = tipo?.origen === 'OFICIO'
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/nuevo-documento" className="font-medium text-institutional hover:underline">
        ← Cambiar tipo de documento
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : tipo === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <div className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">
              {porLista ? `Emisión por lista: ${tipo.nombre}` : tipo.nombre}
            </h2>
            <span className="rounded-full bg-green-pale px-3 py-1 text-sm font-medium text-institutional">
              Origen: {porLista ? 'De oficio' : 'A solicitud de parte'}
            </span>
          </div>
          {porLista ? (
            <FormularioLote tipo={tipo} areaNombre={areaNombre} />
          ) : (
            <FormularioSolicitud tipo={tipo} />
          )}
        </div>
      )}
    </section>
  )
}
