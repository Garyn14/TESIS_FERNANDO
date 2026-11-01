import { CAMPO } from '../comun/estilos'
import type { Campo } from './api'

interface Props {
  id: string
  etiqueta: string
  ayuda?: string | null
  valor: string
  error?: string
  onCambiar: (valor: string) => void
  tipo?: 'texto' | 'fecha' | 'numero'
  /** Si hay opciones, el campo es una lista desplegable. */
  opciones?: string[]
  maxLength?: number
}

/** Campo con su etiqueta, su ayuda y su mensaje de error, como los del Sprint 1. */
export default function CampoFormulario({
  id,
  etiqueta,
  ayuda,
  valor,
  error,
  onCambiar,
  tipo = 'texto',
  opciones,
  maxLength,
}: Props) {
  const propiedades = {
    id,
    value: valor,
    onChange: (e: { target: { value: string } }) => onCambiar(e.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    className: `${CAMPO} ${error ? 'border-red-600' : 'border-line'}`,
  }
  return (
    <div>
      <label htmlFor={id} className="font-medium">
        {etiqueta}
        {ayuda && <span className="ml-2 font-normal text-muted">{ayuda}</span>}
      </label>
      {opciones ? (
        <select {...propiedades}>
          <option value="">Seleccione</option>
          {opciones.map((o) => (
            <option key={o} value={o}>
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...propiedades}
          type={tipo === 'fecha' ? 'date' : 'text'}
          inputMode={tipo === 'numero' ? 'numeric' : undefined}
          maxLength={maxLength}
          autoComplete="off"
        />
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/** Campo de la plantilla del tipo de documento (HU08, HU09). */
export function CampoDePlantilla({
  campo,
  ...resto
}: { campo: Campo } & Omit<Props, 'etiqueta' | 'ayuda' | 'tipo' | 'opciones'>) {
  return (
    <CampoFormulario
      {...resto}
      etiqueta={campo.etiqueta}
      ayuda={campo.ayuda}
      tipo={campo.tipo === 'FECHA' ? 'fecha' : campo.tipo === 'NUMERO' ? 'numero' : 'texto'}
      opciones={campo.tipo === 'OPCION' ? campo.opciones : undefined}
    />
  )
}
