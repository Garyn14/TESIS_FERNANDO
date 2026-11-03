import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import CampoFormulario from './CampoFormulario'
import { leer, mostrar } from './fecha'

/** El campo con su estado, como lo usan los formularios de HU08 y HU09. */
function Campo({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <CampoFormulario
        id="fecha"
        etiqueta="Fecha de inicio"
        tipo="fecha"
        valor={valor}
        onCambiar={setValor}
      />
      <output aria-label="Valor del formulario">{valor}</output>
    </>
  )
}

describe('Fechas en día/mes/año (observación de la revisión del Sprint 2)', () => {
  it('convierte lo escrito en dd/mm/aaaa a la fecha ISO, y la muestra en dd/mm/aaaa', () => {
    expect(leer('02012025')).toBe('2025-01-02')
    expect(leer('02/01/2025')).toBe('2025-01-02')
    expect(leer('0201')).toBe('02/01')
    expect(leer('31/02/2026')).toBe('31/02/2026')
    expect(mostrar('2025-01-02')).toBe('02/01/2025')
    expect(mostrar('02/01')).toBe('02/01')
  })

  it('el campo muestra día/mes/año aunque el navegador esté en inglés', () => {
    render(<Campo inicial="2026-09-30" />)
    const campo = screen.getByLabelText('Fecha de inicio')
    expect(campo).toHaveValue('30/09/2026')
    expect(campo).toHaveAttribute('placeholder', 'dd/mm/aaaa')
    expect(campo).toHaveAttribute('type', 'text')
  })

  it('al escribir pone las barras y entrega la fecha ISO al formulario', () => {
    render(<Campo />)
    const campo = screen.getByLabelText('Fecha de inicio')
    fireEvent.change(campo, { target: { value: '0201' } })
    expect(campo).toHaveValue('02/01')
    fireEvent.change(campo, { target: { value: '02012025' } })
    expect(campo).toHaveValue('02/01/2025')
    expect(screen.getByLabelText('Valor del formulario')).toHaveTextContent('2025-01-02')
  })

  it('el calendario del navegador sigue disponible para elegir la fecha', () => {
    render(<Campo />)
    expect(screen.getByRole('button', { name: 'Abrir calendario' })).toBeInTheDocument()
  })
})
