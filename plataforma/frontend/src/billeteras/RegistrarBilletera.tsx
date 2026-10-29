import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import { registrarBilletera, type CuentaConBilletera } from './api'

const FORMATO = /^0x[0-9a-fA-F]{40}$/

interface Props {
  cuenta: CuentaConBilletera
  onRegistrada: (cuenta: CuentaConBilletera) => void
  onCancelar: () => void
}

/** HU06 (RF07): dirección pública de la billetera del director. Nunca se pide una clave. */
export default function RegistrarBilletera({ cuenta, onRegistrada, onCancelar }: Props) {
  const id = useId()
  const [direccion, setDireccion] = useState(cuenta.billetera ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const valor = direccion.trim()
    if (!FORMATO.test(valor)) {
      setError('La dirección debe empezar con 0x y tener 40 caracteres hexadecimales.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      onRegistrada(await registrarBilletera(cuenta.id, valor))
    } catch (e) {
      setError(
        e instanceof ErrorApi ? (e.campos.direccion ?? e.message) : 'Ocurrió un error inesperado.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <p>
        Billetera de <strong>{cuenta.nombreCompleto}</strong> ({cuenta.nombreUsuario}).
      </p>
      <div>
        <label htmlFor={`${id}-direccion`} className="font-medium">
          Dirección de la billetera
        </label>
        <input
          id={`${id}-direccion`}
          value={direccion}
          onChange={(e) => {
            setDireccion(e.target.value)
            setError('')
          }}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          maxLength={42}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          className={`${CAMPO} font-mono ${error ? 'border-red-600' : 'border-line'}`}
        />
        {error ? (
          <p id={`${id}-ayuda`} role="alert" className="mt-1 text-red-700">
            {error}
          </p>
        ) : (
          <p id={`${id}-ayuda`} className="mt-1 text-muted">
            Cópiela desde la billetera del director (empieza con 0x). Es una dirección pública: la
            plataforma nunca pide ni guarda claves.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
          {guardando ? 'Guardando…' : 'Guardar billetera'}
        </button>
      </div>
    </form>
  )
}
