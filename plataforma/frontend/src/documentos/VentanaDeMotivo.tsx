import { useId, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import Modal from '../comun/Modal'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'

interface Props {
  titulo: string
  rechazo: boolean
  /** Aviso de una acción definitiva; por defecto, el del rechazo. */
  aviso?: string
  onConfirmar: (motivo: string) => Promise<void>
  onCerrar: () => void
}

/** Ventana de motivo del prototipo (HU12, HU13, HU14): el motivo es obligatorio. */
export default function VentanaDeMotivo({
  titulo,
  rechazo,
  aviso = 'El rechazo es definitivo. El documento no podrá reenviarse.',
  onConfirmar,
  onCerrar,
}: Props) {
  const id = useId()
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      await onConfirmar(motivo.trim())
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo registrar la decisión.')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={() => !enviando && onCerrar()}>
      <div className="space-y-4">
        <label htmlFor={id} className="block font-medium">
          Motivo
          <textarea
            id={id}
            value={motivo}
            maxLength={500}
            rows={4}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique qué debe corregirse"
            className={`${CAMPO} border-line font-normal`}
          />
        </label>
        {rechazo && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{aviso}</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={enviando} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || motivo.trim() === ''}
            className={rechazo ? BOTON_ADVERTENCIA : BOTON_PRIMARIO}
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  )
}
