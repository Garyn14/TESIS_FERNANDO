import { CAMPO } from '../comun/estilos'

interface Props {
  id: string
  valor: string
  error?: string
  onCambiar: (valor: string) => void
}

/** HU30: motivo de la reemisión, obligatorio y de hasta 500 caracteres. */
export default function CampoMotivoReemision({ id, valor, error, onCambiar }: Props) {
  return (
    <div>
      <label htmlFor={id} className="font-medium">
        Motivo de la reemisión
      </label>
      <textarea
        id={id}
        value={valor}
        maxLength={500}
        rows={3}
        placeholder="Ej.: Corrección del apellido del beneficiario"
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CAMPO} ${error ? 'border-red-600' : 'border-line'}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
