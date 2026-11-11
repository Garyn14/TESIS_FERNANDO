import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Certificado from './Certificado'
import type { VistaPrevia } from './api'

const PREVIA: VistaPrevia = {
  tipo: 'CONSTANCIA_PRODUCTOR_ACTIVO',
  tipoNombre: 'Constancia de Productor Activo',
  titulo: 'CONSTANCIA',
  numeroExpediente: 'EXP-2026-007301',
  nombres: 'Lucía',
  apellidos: 'Paredes Quinto',
  dni: '45829364',
  texto: 'Se deja constancia de que es productora activa.',
  firmante: null,
}

describe('Vista previa del documento (DRA-62)', () => {
  it('informa la vigencia del tipo', () => {
    render(<Certificado documento={{ ...PREVIA, vigenciaMeses: 12 }} />)
    expect(screen.getByText('Vigencia: 12 meses desde la fecha de emisión')).toBeInTheDocument()
  })

  it('sin vigencia no agrega nada', () => {
    render(<Certificado documento={{ ...PREVIA, vigenciaMeses: null }} />)
    expect(screen.queryByText(/Vigencia/)).not.toBeInTheDocument()
  })
})
