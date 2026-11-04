import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Estado from './Estado'

describe('Estado de un documento (HU17)', () => {
  it('muestra Pendiente en ámbar', () => {
    render(<Estado estado="PENDIENTE" />)
    expect(screen.getByText('Pendiente')).toHaveClass('text-amber')
  })

  it('muestra Procesando firma en azul', () => {
    render(<Estado estado="PROCESANDO_FIRMA" />)
    expect(screen.getByText('Procesando firma')).toHaveClass('bg-blue-pale', 'text-blue')
  })

  it('muestra Firmado en verde (HU11)', () => {
    render(<Estado estado="FIRMADO" />)
    expect(screen.getByText('Firmado')).toHaveClass('bg-green-pale', 'text-institutional')
  })
})
