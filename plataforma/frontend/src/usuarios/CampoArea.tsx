import { CAMPO } from '../comun/estilos'
import type { Area } from './api'

interface Props {
  id: string
  valor: string
  areas: Area[]
  error?: string
  onCambiar: (area: string) => void
}

/** HU05: área del usuario del Área encargada, con los tipos de documento que emite (RF06). */
export default function CampoArea({ id, valor, areas, error, onCambiar }: Props) {
  const elegida = areas.find((a) => a.codigo === valor)
  return (
    <div>
      <label htmlFor={id} className="font-medium">
        Área
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CAMPO} ${error ? 'border-red-600' : 'border-line'}`}
      >
        <option value="">Seleccione el área</option>
        {areas.map((a) => (
          <option key={a.codigo} value={a.codigo}>
            {a.nombre}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-red-700">
          {error}
        </p>
      ) : elegida ? (
        <p className="mt-1 text-muted">Emite: {elegida.tipos.map((t) => t.nombre).join(', ')}.</p>
      ) : (
        <p className="mt-1 text-muted">Solo verá los documentos de esta área.</p>
      )}
    </div>
  )
}
