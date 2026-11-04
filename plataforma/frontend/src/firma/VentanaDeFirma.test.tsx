import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as billetera from '../blockchain/billetera'
import VentanaDeFirma from './VentanaDeFirma'

vi.mock('../blockchain/billetera', async (original) => ({
  ...(await original<typeof import('../blockchain/billetera')>()),
  conectar: vi.fn(),
  registrarDocumentos: vi.fn(),
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
const TX = '0x' + 'a'.repeat(64)

function servidor(respuestas: Record<string, unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (ruta) => {
    const r = String(ruta)
    const cuerpo = respuestas[r]
    return new Response(JSON.stringify(cuerpo ?? {}), { status: cuerpo ? 200 : 404 })
  })
}

const BASE = {
  '/api/blockchain/red': RED,
  '/api/firma/billetera': { billetera: DIRECTOR, firmante: true, aviso: null },
  '/api/firma/preparacion': {
    preparados: [
      { codigo: 'DRA-2026-F8R2MA', hash: 'ab'.repeat(32), cid: 'bafy1', dniHmac: 'cd'.repeat(32) },
    ],
    noPreparados: [
      {
        codigo: 'DRA-2026-K7M4PX',
        motivo: 'No se pudo guardar el PDF. El documento volvió a Pendiente.',
      },
    ],
  },
  '/api/firma/confirmacion': {
    transaccion: TX,
    bloque: 12,
    firmados: [{ codigo: 'DRA-2026-F8R2MA', fechaEmision: '2026-11-04T15:30Z' }],
    noAplicados: [],
  },
}

const SELECCION = {
  codigos: ['DRA-2026-F8R2MA', 'DRA-2026-K7M4PX'],
  lotes: [],
  cantidad: 2,
  nombres: {
    'DRA-2026-F8R2MA': 'Certificado de Trabajo – Lucía Paredes Quinto',
    'DRA-2026-K7M4PX': 'Certificado de Capacitación – Juan Ccori Pari',
  },
}

beforeEach(() => vi.restoreAllMocks())

describe('Ventana de firma (HU11)', () => {
  it('verifica la billetera, pide confirmación, firma y muestra el resultado', async () => {
    const fetch = servidor(BASE)
    vi.mocked(billetera.conectar).mockResolvedValue(DIRECTOR)
    vi.mocked(billetera.registrarDocumentos).mockResolvedValue(TX)
    const onCerrar = vi.fn()
    render(
      <VentanaDeFirma
        seleccion={SELECCION}
        director="Ing. Carlos Mendoza Rivera"
        onCerrar={onCerrar}
      />,
    )

    expect(await screen.findByText('Firmar 2 documentos')).toBeInTheDocument()
    expect(screen.getByText(/Ing. Carlos Mendoza Rivera/)).toHaveTextContent('(0x7c1E…4B9a)')
    expect(screen.getByText('Sin costo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    const listo = await screen.findByText(/Se firmó 1 documento/)
    expect(listo).toBeInTheDocument()
    expect(billetera.registrarDocumentos).toHaveBeenCalledWith(
      RED,
      [
        {
          codigo: 'DRA-2026-F8R2MA',
          hash: 'ab'.repeat(32),
          cid: 'bafy1',
          dniHmac: 'cd'.repeat(32),
        },
      ],
      expect.any(Function),
    )
    const aviso = screen.getByText(
      /1 documento no se pudo firmar y volvió a Por revisar/,
    ).parentElement!
    expect(
      within(aviso).getByText(
        /Certificado de Capacitación – Juan Ccori Pari: No se pudo guardar el PDF/,
      ),
    ).toBeInTheDocument()
    const confirmacion = fetch.mock.calls.find(([r]) => r === '/api/firma/confirmacion')!
    expect(JSON.parse(String(confirmacion[1]?.body))).toEqual({ transaccion: TX })

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Por revisar' }))
    expect(onCerrar).toHaveBeenCalledWith(
      expect.objectContaining({ firmados: ['DRA-2026-F8R2MA'] }),
    )
  })

  it('no firma con una billetera distinta de la registrada', async () => {
    const fetch = servidor(BASE)
    vi.mocked(billetera.conectar).mockResolvedValue('0x1111111111111111111111111111111111111111')
    render(<VentanaDeFirma seleccion={SELECCION} director="Carlos" onCerrar={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La billetera conectada (0x1111…1111) no es la registrada para su cuenta (0x7c1E…4B9a)',
    )
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(fetch.mock.calls.some(([r]) => r === '/api/firma/preparacion')).toBe(false)
  })

  it('sin el rol de firmante muestra el aviso del servidor y no conecta la billetera', async () => {
    servidor({
      ...BASE,
      '/api/firma/billetera': {
        billetera: DIRECTOR,
        firmante: false,
        aviso: 'Su billetera no tiene el rol de firmante en el contrato.',
      },
    })
    render(<VentanaDeFirma seleccion={SELECCION} director="Carlos" onCerrar={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene el rol de firmante')
    expect(billetera.conectar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Intentar nuevamente' })).toBeInTheDocument()
  })
})
