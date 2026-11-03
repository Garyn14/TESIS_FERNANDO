import { useRef } from 'react'
import { CAMPO } from '../comun/estilos'
import type { Campo } from './api'
import { leer, mostrar } from './fecha'

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
  const calendario = useRef<HTMLInputElement>(null)
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
      ) : tipo === 'fecha' ? (
        // Campo propio en día/mes/año: el selector del navegador muestra el formato del idioma
        // del sistema (mes/día/año en inglés). El botón abre ese calendario solo para elegir.
        <div className="relative">
          <input
            {...propiedades}
            value={mostrar(valor)}
            onChange={(e) => onCambiar(leer(e.target.value))}
            type="text"
            placeholder="dd/mm/aaaa"
            inputMode="numeric"
            maxLength={10}
            autoComplete="off"
            className={`${propiedades.className} pr-12`}
          />
          <input
            ref={calendario}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={/^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : ''}
            onChange={(e) => e.target.value && onCambiar(e.target.value)}
            className="pointer-events-none absolute right-2 bottom-0 h-0 w-0 opacity-0"
          />
          <button
            type="button"
            aria-label="Abrir calendario"
            title="Abrir calendario"
            onClick={() => calendario.current?.showPicker?.()}
            className="absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 rounded px-2 py-1 text-institutional hover:bg-green-pale"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
          </button>
        </div>
      ) : (
        <input
          {...propiedades}
          type="text"
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
