import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { antiguedad, type Aviso } from './api'
import Campana from './Campana'

const AHORA = Date.now()
const hace = (minutos: number) => new Date(AHORA - minutos * 60_000).toISOString()

const AVISOS: Aviso[] = [
  {
    id: 2,
    tipo: 'PENDIENTE_REVISION',
    texto:
      'Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)',
    enlace: 'por-revisar/lote/2026-001',
    creadoEn: hace(5),
    leido: false,
  },
  {
    id: 1,
    tipo: 'PENDIENTE_REVISION',
    texto: 'Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto',
    enlace: 'por-revisar/DRA-2026-F8R2MA',
    creadoEn: hace(180),
    leido: true,
  },
]

let pedidos: string[]

function backend(avisos: Aviso[], sinLeer: number) {
  pedidos = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    pedidos.push(`${opciones?.method ?? 'GET'} ${ruta}`)
    if (opciones?.method === 'POST') return Promise.resolve(new Response(null, { status: 204 }))
    return Promise.resolve(new Response(JSON.stringify({ avisos, sinLeer }), { status: 200 }))
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})
afterEach(() => vi.restoreAllMocks())

describe('Campana de avisos (HU26)', () => {
  it('muestra cuántos avisos hay sin leer', async () => {
    backend(AVISOS, 1)
    render(<Campana />)
    expect(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' })).toHaveTextContent('1')
  })

  it('sin avisos sin leer no muestra la cantidad, y el panel lo informa', async () => {
    backend([], 0)
    render(<Campana />)
    await vi.waitFor(() => expect(pedidos).toContain('GET /api/avisos'))
    const campana = screen.getByRole('button', { name: 'Avisos' })
    expect(campana).not.toHaveTextContent(/\d/)
    fireEvent.click(campana)
    expect(await screen.findByText('No tiene avisos.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Marcar todos como leídos' }),
    ).not.toBeInTheDocument()
  })

  it('el panel lista los avisos con su antigüedad, y los no leídos llevan un punto', async () => {
    backend(AVISOS, 1)
    render(<Campana />)
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))
    const panel = screen.getByRole('region', { name: 'Avisos' })
    const enlaces = within(panel).getAllByRole('link')
    expect(enlaces).toHaveLength(2)
    expect(enlaces[0]).toHaveAttribute('href', '#/por-revisar/lote/2026-001')
    expect(enlaces[0]).toHaveTextContent('hace 5 min')
    expect(within(enlaces[0]).getByLabelText('Sin leer')).toBeInTheDocument()
    expect(enlaces[1]).toHaveAttribute('href', '#/por-revisar/DRA-2026-F8R2MA')
    expect(enlaces[1]).toHaveTextContent('hace 3 h')
    expect(within(enlaces[1]).queryByLabelText('Sin leer')).not.toBeInTheDocument()
  })

  it('al pulsar un aviso sin leer lo marca como leído y cierra el panel', async () => {
    backend(AVISOS, 1)
    render(<Campana />)
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))
    fireEvent.click(screen.getByRole('link', { name: /Nuevo lote pendiente/ }))
    expect(screen.queryByRole('region', { name: 'Avisos' })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(pedidos).toContain('POST /api/avisos/2/lectura'))
    // Uno ya leído no se vuelve a marcar.
    fireEvent.click(screen.getByRole('button', { name: /Avisos/ }))
    fireEvent.click(screen.getByRole('link', { name: /Nuevo documento pendiente/ }))
    expect(pedidos).not.toContain('POST /api/avisos/1/lectura')
  })

  it('marca todos como leídos', async () => {
    backend(AVISOS, 1)
    render(<Campana />)
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todos como leídos' }))
    await vi.waitFor(() => expect(pedidos).toContain('POST /api/avisos/lectura'))
  })

  it('se cierra con Escape y al pulsar fuera', async () => {
    backend(AVISOS, 1)
    render(
      <>
        <p>Fuera</p>
        <Campana />
      </>,
    )
    const campana = await screen.findByRole('button', { name: 'Avisos, 1 sin leer' })
    fireEvent.click(campana)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Avisos' })).not.toBeInTheDocument()
    fireEvent.click(campana)
    fireEvent.mouseDown(screen.getByText('Fuera'))
    expect(screen.queryByRole('region', { name: 'Avisos' })).not.toBeInTheDocument()
  })

  it('vuelve a consultar al cambiar de pantalla y al volver a la ventana, nunca a intervalos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    backend(AVISOS, 1)
    render(<Campana />)
    await vi.waitFor(() => expect(pedidos).toHaveLength(1))
    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })
    expect(pedidos).toHaveLength(1)
    act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await vi.waitFor(() => expect(pedidos).toHaveLength(2))
    act(() => {
      window.dispatchEvent(new FocusEvent('focus'))
    })
    await vi.waitFor(() => expect(pedidos).toHaveLength(3))
    vi.useRealTimers()
  })
})

describe('Antigüedad de un aviso', () => {
  const ahora = new Date('2026-11-08T15:00:00Z')
  it.each([
    ['2026-11-08T14:59:40Z', 'hace un momento'],
    ['2026-11-08T14:55:00Z', 'hace 5 min'],
    ['2026-11-08T12:00:00Z', 'hace 3 h'],
    ['2026-11-07T10:00:00Z', 'ayer'],
    ['2026-11-01T10:00:00Z', '01/11/2026'],
  ])('%s es "%s"', (iso, texto) => {
    expect(antiguedad(iso, ahora)).toBe(texto)
  })
})
