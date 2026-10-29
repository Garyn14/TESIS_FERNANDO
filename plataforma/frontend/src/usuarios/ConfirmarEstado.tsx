import { useState } from 'react'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { desactivarCuenta, reactivarCuenta, type Cuenta } from './api'

interface Props {
  cuenta: Cuenta
  onConfirmada: (cuenta: Cuenta) => void
  onCancelar: () => void
}

/** HU02: confirmación para desactivar o reactivar una cuenta. */
export default function ConfirmarEstado({ cuenta, onConfirmada, onCancelar }: Props) {
  const desactivar = cuenta.activo
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      onConfirmada(await (desactivar ? desactivarCuenta(cuenta.id) : reactivarCuenta(cuenta.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      {desactivar ? (
        <>
          <p>
            <strong>{cuenta.nombreCompleto}</strong> ({cuenta.nombreUsuario}) ya no podrá iniciar
            sesión.
          </p>
          <p className="text-muted">
            La cuenta no se elimina: se conservan sus datos y su historial, y se puede reactivar
            cuando sea necesario.
          </p>
        </>
      ) : (
        <p>
          <strong>{cuenta.nombreCompleto}</strong> ({cuenta.nombreUsuario}) podrá volver a iniciar
          sesión con el rol {cuenta.rolNombre}.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className={desactivar ? BOTON_ADVERTENCIA : BOTON_PRIMARIO}
        >
          {enviando ? 'Procesando…' : desactivar ? 'Desactivar cuenta' : 'Reactivar cuenta'}
        </button>
      </div>
    </div>
  )
}
