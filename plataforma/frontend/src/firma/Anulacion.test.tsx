import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as billetera from '../blockchain/billetera'
import PaginaFirmados from './PaginaFirmados'

vi.mock('../blockchain/billetera', async (original) => ({
  ...(await original<typeof import('../blockchain/billetera')>()),
  conectar: vi.fn(),
  anularDocumento: vi.fn(),
}))

const DIRECTOR = '0x7c1E6D2a3b4C5d6E7f8091a2B3c4D5e6F7a84B9a'
const RED = {
  chainId: 20260,
  chainIdHex: '0x4f24',
  nombre: 'Plataforma DRA Satipo',
  rpcUrl: 'http://localhost:8545',
  contrato: '0x3fef5c0221a4cab41d49f1a0610a4205c48e8a40',
  firmanteRol: '0x00',
}
const TX = '0x' + 'b'.repeat(64)

const SUELTO = {
  codigo: 'DRA-2026-F8R2MA',
  lote: null,
  evento: null,
  tipoNombre: 'Certificado de Trabajo',
  nombres: 'Lucía',
  apellidos: 'Paredes Quinto',
  dni: '45829364',
  areaNombre: 'Área de Administración',
  firmadoEn: '2026-11-03T15:00:00Z',
  estado: 'FIRMADO',
  anuladoEn: null,
  motivoAnulacion: null,
}
const DEL_LOTE = (
  codigo: string,
  nombres: string,
  estado = 'FIRMADO',
  motivo: string | null = null,
) => ({
  ...SUELTO,
  codigo,
  lote: 'L-2026-0004',
  evento: 'Taller de cacao',
  tipoNombre: 'Certificado de Capacitación',
  nombres,
  apellidos: 'Ccori Pari',
  dni: '4' + codigo.slice(-7).replace(/\D/g, '1').padStart(7, '0'),
  areaNombre: 'Área de Producción',
  firmadoEn: '2026-11-02T15:00:00Z',
  estado,
  motivoAnulacion: motivo,
})

const LISTA = [
  SUELTO,
  DEL_LOTE('DRA-2026-K7M4PX', 'Juan'),
  DEL_LOTE('DRA-2026-Q2W3ER', 'Rosa', 'ANULADO', 'Error en el nombre'),
]

function servidor(extra: Record<string, unknown> = {}) {
  const respuestas: Record<string, unknown> = {
    '/api/firmados': LISTA,
    '/api/blockchain/red': RED,
    '/api/firma/billetera': { billetera: DIRECTOR, firmante: true, aviso: null },
    '/api/anulacion/DRA-2026-F8R2MA/solicitud': SUELTO,
    '/api/anulacion/DRA-2026-F8R2MA/confirmacion': { ...SUELTO, estado: 'ANULADO' },
    '/api/anulacion/DRA-2026-F8R2MA/cancelacion': SUELTO,
    ...extra,
  }
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (ruta) => {
    const cuerpo = respuestas[String(ruta)]
    return new Response(JSON.stringify(cuerpo ?? {}), { status: cuerpo ? 200 : 404 })
  })
}

const llamadas = (fetch: ReturnType<typeof servidor>, ruta: string) =>
  fetch.mock.calls.filter(([r]) => r === ruta)

async function pedirAnulacion() {
  fireEvent.click(await screen.findByRole('button', { name: 'Anular DRA-2026-F8R2MA' }))
  const motivo = screen.getByRole('dialog', { name: 'Anular documento' })
  expect(motivo).toHaveTextContent('La anulación es definitiva.')
  const confirmar = within(motivo).getByRole('button', { name: 'Confirmar' })
  expect(confirmar).toBeDisabled()
  fireEvent.change(within(motivo).getByLabelText('Motivo', { exact: false }), {
    target: { value: 'El DNI del beneficiario estaba errado' },
  })
  fireEvent.click(confirmar)
}

beforeEach(() => vi.restoreAllMocks())

describe('Documentos firmados (HU29)', () => {
  it('lista los firmados con los lotes agrupados y filtra por nombre o código', async () => {
    servidor()
    render(<PaginaFirmados director="Ing. Carlos Mendoza Rivera" />)
    const fila = (await screen.findByText('DRA-2026-F8R2MA')).closest('tr')!
    expect(fila).toHaveTextContent('Lucía Paredes Quinto')
    expect(fila).toHaveTextContent('DNI 45829364')
    expect(fila).toHaveTextContent('03/11/2026')
    expect(fila).toHaveTextContent('Firmado')

    const lote = screen.getByRole('button', { name: /Lote L-2026-0004/ })
    expect(lote.closest('tr')).toHaveTextContent('Taller de cacao · 2 certificados')
    expect(lote.closest('tr')).toHaveTextContent('1 anulado')
    expect(screen.queryByText('DRA-2026-K7M4PX')).not.toBeInTheDocument()
    fireEvent.click(lote)
    expect(screen.getByRole('button', { name: 'Anular DRA-2026-K7M4PX' })).toBeInTheDocument()
    const anulado = screen.getByText('DRA-2026-Q2W3ER').closest('tr')!
    expect(anulado).toHaveTextContent('Anulado')
    expect(anulado).toHaveTextContent('Motivo: Error en el nombre')
    expect(within(anulado).queryByRole('button')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rosa' } })
    expect(screen.queryByText('DRA-2026-F8R2MA')).not.toBeInTheDocument()
    expect(screen.getByText('DRA-2026-Q2W3ER')).toBeInTheDocument()
  })

  it('anula con motivo y billetera, y el servidor confirma la anulación', async () => {
    const fetch = servidor()
    vi.mocked(billetera.conectar).mockResolvedValue(DIRECTOR)
    vi.mocked(billetera.anularDocumento).mockResolvedValue(TX)
    render(<PaginaFirmados director="Ing. Carlos Mendoza Rivera" />)
    await pedirAnulacion()

    const ventana = await screen.findByRole('dialog', { name: 'Anular con su billetera' })
    expect(await within(ventana).findByText('Anular 1 documento')).toBeInTheDocument()
    expect(ventana).toHaveTextContent('(0x7c1E…4B9a)')
    expect(ventana).toHaveTextContent('Plataforma DRA Satipo')
    expect(ventana).toHaveTextContent('Sin costo')
    const [, solicitud] = llamadas(fetch, '/api/anulacion/DRA-2026-F8R2MA/solicitud')[0]
    expect(JSON.parse(String(solicitud?.body))).toEqual({
      motivo: 'El DNI del beneficiario estaba errado',
    })

    fireEvent.click(within(ventana).getByRole('button', { name: 'Confirmar' }))
    expect(await within(ventana).findByText(/Documento anulado/)).toBeInTheDocument()
    expect(billetera.anularDocumento).toHaveBeenCalledWith(RED, 'DRA-2026-F8R2MA')
    const [, confirmacion] = llamadas(fetch, '/api/anulacion/DRA-2026-F8R2MA/confirmacion')[0]
    expect(JSON.parse(String(confirmacion?.body))).toEqual({ transaccion: TX })

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Documentos firmados' }))
    await waitFor(() => expect(llamadas(fetch, '/api/firmados')).toHaveLength(2))
  })

  it('si se cancela en la billetera descarta la anulación y el documento sigue firmado', async () => {
    const fetch = servidor()
    vi.mocked(billetera.conectar).mockResolvedValue(DIRECTOR)
    const cancelada = new billetera.ErrorBilletera('Cancelado')
    cancelada.cancelada = true
    vi.mocked(billetera.anularDocumento).mockRejectedValue(cancelada)
    render(<PaginaFirmados director="Ing. Carlos Mendoza Rivera" />)
    await pedirAnulacion()
    const ventana = await screen.findByRole('dialog', { name: 'Anular con su billetera' })
    fireEvent.click(await within(ventana).findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Anulación cancelada en la billetera. El documento sigue firmado.',
    )
    expect(llamadas(fetch, '/api/anulacion/DRA-2026-F8R2MA/cancelacion')).toHaveLength(1)
    expect(llamadas(fetch, '/api/anulacion/DRA-2026-F8R2MA/confirmacion')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Intentar nuevamente' })).not.toBeInTheDocument()
  })

  it('con otra billetera conectada no envía la anulación', async () => {
    servidor()
    vi.mocked(billetera.conectar).mockResolvedValue('0x1111111111111111111111111111111111111111')
    render(<PaginaFirmados director="Ing. Carlos Mendoza Rivera" />)
    await pedirAnulacion()
    expect(await screen.findByRole('alert')).toHaveTextContent('no es la registrada para su cuenta')
    expect(billetera.anularDocumento).not.toHaveBeenCalled()
  })
})
