import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizarCodigo } from './api'
import App from './App'

const VALIDO = {
  resultado: 'VALIDO',
  mensaje: 'El documento es auténtico: coincide con su registro en la blockchain.',
  tipo: 'Certificado de Trabajo',
  titular: 'Lucía Paredes Quinto',
  fechaEmision: '2026-11-04T15:30:00Z',
  anuladoEn: null,
  versionCorregida: false,
}

function servidor(estado: number, cuerpo: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(cuerpo), { status: estado }))
}

const campo = () => screen.getByLabelText('Código de verificación')
const verificar = () => fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))

afterEach(() => vi.restoreAllMocks())

describe('Verificar con el código de verificación (HU20)', () => {
  it('lee el código con minúsculas, espacios o sin guiones, y rechaza otro formato', () => {
    expect(normalizarCodigo(' dra-2026-f8r2ma ')).toBe('DRA-2026-F8R2MA')
    expect(normalizarCodigo('dra 2026 f8r2ma')).toBe('DRA-2026-F8R2MA')
    expect(normalizarCodigo('DRA2026F8R2MA')).toBe('DRA-2026-F8R2MA')
    // Sin caracteres que se confunden: 0, 1, I, L, O.
    expect(normalizarCodigo('DRA-2026-F8R2M0')).toBeNull()
    expect(normalizarCodigo('DRA-2026-F8R2M')).toBeNull()
    expect(normalizarCodigo('')).toBeNull()
  })

  it('un formato inválido se señala junto al campo, sin consultar al servidor', () => {
    const fetch = servidor(200, VALIDO)
    render(<App ruta="/" />)
    fireEvent.change(campo(), { target: { value: 'DRA-26-123' } })
    verificar()
    expect(
      screen.getByText(
        'Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA.',
      ),
    ).toBeInTheDocument()
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('muestra solo los datos básicos y no el documento', async () => {
    const fetch = servidor(200, VALIDO)
    render(<App ruta="/" />)
    fireEvent.change(campo(), { target: { value: 'dra 2026 f8r2ma' } })
    verificar()
    expect(screen.getByRole('status')).toHaveTextContent('Verificando el documento…')
    const resultado = await screen.findByRole('region', { name: 'Documento válido' })
    expect(resultado).toHaveTextContent('Lucía Paredes Quinto')
    expect(resultado).toHaveTextContent('4 de noviembre de 2026')
    expect(resultado).toHaveTextContent('Vigente')
    expect(fetch).toHaveBeenCalledWith(
      '/api/verificacion/codigo/DRA-2026-F8R2MA',
      expect.anything(),
    )
    expect(campo()).toHaveValue('DRA-2026-F8R2MA')
    expect(screen.queryByRole('region', { name: 'Documento completo' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Para ver el documento completo, escanee su código QR.'),
    ).toBeInTheDocument()
  })

  it('con demasiadas consultas muestra el aviso del servidor', async () => {
    const mensaje =
      'Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.'
    servidor(429, { mensaje, campos: {} })
    render(<App ruta="/" />)
    fireEvent.change(campo(), { target: { value: 'DRA-2026-F8R2MA' } })
    verificar()
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje)
  })
})
