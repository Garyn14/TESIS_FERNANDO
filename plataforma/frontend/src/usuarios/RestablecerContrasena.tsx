import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import { restablecerContrasena, type Cuenta } from './api'
import { generarContrasenaTemporal } from './generador'

interface Props {
  cuenta: Cuenta
  onRestablecida: (cuenta: Cuenta) => void
  onCerrar: () => void
}

/**
 * HU04: el Administrador asigna una contraseña temporal. Al confirmar, la muestra para entregarla;
 * el servidor nunca la devuelve ni la guarda en claro.
 */
export default function RestablecerContrasena({ cuenta, onRestablecida, onCerrar }: Props) {
  const id = useId()
  const [temporal, setTemporal] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [entregar, setEntregar] = useState<string | null>(null)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (temporal.length < 8 || temporal.length > 20) {
      setError('La contraseña debe tener de 8 a 20 caracteres.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      onRestablecida(await restablecerContrasena(cuenta.id, temporal))
      setEntregar(temporal)
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.campos.contrasenaTemporal ?? e.message)
          : 'Ocurrió un error inesperado.',
      )
    } finally {
      setEnviando(false)
    }
  }

  if (entregar)
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
          ✓ Se restableció la contraseña de {cuenta.nombreCompleto}.
        </p>
        <div>
          <p>Entregue esta contraseña temporal a la persona:</p>
          <p className="mt-2 rounded-lg bg-neutral-pale px-4 py-3 text-center font-mono text-xl tracking-wider">
            {entregar}
          </p>
        </div>
        <p className="text-muted">
          Deberá cambiarla en su próximo inicio de sesión. Si tenía una sesión abierta, se cerró.
          Esta contraseña no se volverá a mostrar.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onCerrar} className={BOTON_PRIMARIO}>
            Listo
          </button>
        </div>
      </div>
    )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <p>
        Asigne una contraseña temporal a <strong>{cuenta.nombreCompleto}</strong> (
        {cuenta.nombreUsuario}). Si la cuenta estaba bloqueada por intentos fallidos, quedará
        desbloqueada.
      </p>
      <div>
        <label htmlFor={`${id}-temporal`} className="font-medium">
          Contraseña temporal
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`${id}-temporal`}
            value={temporal}
            onChange={(e) => {
              setTemporal(e.target.value)
              setError('')
            }}
            autoComplete="off"
            maxLength={20}
            aria-invalid={error ? true : undefined}
            className={`${CAMPO} mt-0 font-mono ${error ? 'border-red-600' : 'border-line'}`}
          />
          <button
            type="button"
            onClick={() => {
              setTemporal(generarContrasenaTemporal())
              setError('')
            }}
            className={BOTON_SECUNDARIO}
          >
            Generar
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-red-700">
            {error}
          </p>
        ) : (
          <p className="mt-1 text-muted">De 8 a 20 caracteres.</p>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
          {enviando ? 'Restableciendo…' : 'Restablecer contraseña'}
        </button>
      </div>
    </form>
  )
}
