import { useId, useState, type FormEvent } from 'react'
import { normalizarCodigo, verificarCodigo, type Verificacion } from './api'
import TarjetaResultado from './TarjetaResultado'

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'verificando' }
  | { tipo: 'no-disponible'; mensaje: string }
  | { tipo: 'listo'; verificacion: Verificacion }

const FORMATO = 'Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA.'

/**
 * Portada del portal: cómo verificar con el QR (HU19) y el campo del código de verificación
 * (HU20), para cuando el QR no se puede escanear. Con el código no se muestra el documento (RF40).
 */
export default function Portada() {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' })

  const verificar = async (evento: FormEvent) => {
    evento.preventDefault()
    const normalizado = normalizarCodigo(codigo)
    if (!normalizado) {
      setError(FORMATO)
      return
    }
    setError('')
    setCodigo(normalizado)
    setEstado({ tipo: 'verificando' })
    try {
      setEstado({ tipo: 'listo', verificacion: await verificarCodigo(normalizado) })
    } catch (e) {
      setEstado({ tipo: 'no-disponible', mensaje: (e as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-institutional">Verifique un documento</h1>
        <p className="mt-2 text-muted">
          Compruebe si un certificado o constancia de la Agencia Agraria Satipo es auténtico.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            'Ubique el código QR impreso en el documento, junto a la fecha de emisión.',
            'Escanéelo con la cámara de su celular.',
            'Se abrirá esta página con el resultado y, si es válido, el documento completo.',
          ].map((paso, i) => (
            <li key={paso} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-pale font-semibold text-institutional">
                {i + 1}
              </span>
              <span className="pt-0.5">{paso}</span>
            </li>
          ))}
        </ol>

        <form noValidate onSubmit={verificar} className="mt-8 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">¿No puede escanear el código QR?</h2>
          <p className="mt-1 text-muted">
            Escriba el código de verificación impreso debajo del QR.
          </p>
          <label htmlFor={id} className="mt-4 block font-medium">
            Código de verificación
          </label>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row">
            <input
              id={id}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                setError('')
              }}
              placeholder="DRA-2026-XXXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`w-full rounded-lg border bg-card px-3 py-2 font-mono uppercase sm:max-w-xs ${error ? 'border-red-600' : 'border-line'}`}
            />
            <button
              type="submit"
              disabled={estado.tipo === 'verificando'}
              className="rounded-lg bg-institutional px-5 py-2 font-medium text-white hover:bg-institutional-soft disabled:opacity-60"
            >
              Verificar
            </button>
          </div>
          {error && (
            <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      </section>

      {estado.tipo === 'verificando' && (
        <p
          role="status"
          className="flex items-center gap-3 rounded-xl border border-line bg-card p-6 shadow-sm"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-institutional border-t-transparent"
          />
          Verificando el documento…
        </p>
      )}
      {estado.tipo === 'no-disponible' && (
        <p role="alert" className="rounded-xl border border-amber bg-amber-pale p-6">
          {estado.mensaje}
        </p>
      )}
      {estado.tipo === 'listo' && (
        <>
          <TarjetaResultado v={estado.verificacion} nivel={2} />
          {estado.verificacion.resultado === 'VALIDO' && (
            <p className="text-sm text-muted">
              Para ver el documento completo, escanee su código QR.
            </p>
          )}
        </>
      )}
    </div>
  )
}
