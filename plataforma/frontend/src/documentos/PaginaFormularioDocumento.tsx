import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { tipoPermitido, type TipoDocumento } from './api'

const PASOS_POR_LISTA = ['Datos del evento', 'Beneficiarios', 'Vista previa']

/**
 * HU07: formulario del tipo elegido. Los de oficio abren el registro por lista (HU09) y los de
 * solicitud de parte, el registro individual (HU08). El servidor confirma que el tipo sea del área.
 */
export default function PaginaFormularioDocumento({ codigo }: { codigo: string }) {
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
          {porLista && (
            <ol aria-label="Pasos" className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
              {PASOS_POR_LISTA.map((paso, i) => (
                <li key={paso} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-medium">
                    {i + 1}
                  </span>
                  {paso}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-muted">
            {porLista
              ? 'El formulario de emisión por lista se habilita con la HU09, en este mismo sprint.'
              : 'El formulario a solicitud de parte, con el número de expediente, se habilita con la HU08, en este mismo sprint.'}
          </p>
        </div>
      )}
    </section>
  )
}
