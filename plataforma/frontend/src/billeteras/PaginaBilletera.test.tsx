import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as billetera from '../blockchain/billetera'
import PaginaBilletera from './PaginaBilletera'

vi.mock('../blockchain/billetera', async (original) => ({
  ...(await original<typeof import('../blockchain/billetera')>()),
  conectar: vi.fn(),
  esAdministradorDelContrato: vi.fn(),
  cambiarRolDeFirmante: vi.fn(),
}))

const ADMIN = '0x220Ee3be932a2280c12e218F31265A6Cc6A83D57'
const DIRECTOR = '0x11027E00665C052211fea67178FFE0274f735544'
const TX = '0x' + 'ab'.repeat(32)

const red = {
  chainId: 20260,
  chainIdHex: '0x4f24',
  nombre: 'Plataforma DRA Satipo',
  rpcUrl: 'http://localhost:8545',
  contrato: '0x3FEf5c0221a4caB41D49F1A0610a4205c48e8A40',
  firmanteRol: '0x4647',
}

const carlos = {
  id: 3,
  nombreUsuario: 'cmendoza',
  nombreCompleto: 'Ing. Carlos Mendoza Rivera',
  rol: 'DIRECTOR',
  rolNombre: 'Director',
  activo: true,
  billetera: null as string | null,
  firmante: null as boolean | null,
}

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

function backend(
  cuentas: (typeof carlos)[],
  extra: Record<string, () => Promise<Response>> = {},
  disponible = true,
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`
    if (extra[clave]) return extra[clave]()
    if (clave === 'GET /api/billeteras')
      return respuesta(200, {
        blockchainDisponible: disponible,
        aviso: disponible ? null : 'No se pudo consultar la blockchain.',
        cuentas,
      })
    if (clave === 'GET /api/blockchain/red') return respuesta(200, red)
    return respuesta(500, null)
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('PaginaBilletera (HU06)', () => {
  it('lista los directores con su billetera y el estado leído de la blockchain', async () => {
    backend([
      { ...carlos, billetera: DIRECTOR, firmante: true },
      {
        ...carlos,
        id: 4,
        nombreUsuario: 'exdirector',
        rol: 'CONSULTA_INTERNA',
        billetera: ADMIN,
        firmante: true,
      },
    ])
    render(<PaginaBilletera />)
    expect(await screen.findByText(DIRECTOR)).toBeInTheDocument()
    expect(screen.getAllByText('✓ Firmante activo')).toHaveLength(2)
    expect(screen.getByText(/Ya no es Director: revoque el rol/)).toBeInTheDocument()
    expect(screen.getByText(red.contrato)).toBeInTheDocument()
  })

  it('si la blockchain no responde no muestra estados ni acciones del contrato', async () => {
    backend([{ ...carlos, billetera: DIRECTOR, firmante: null }], {}, false)
    render(<PaginaBilletera />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo consultar la blockchain.',
    )
    expect(screen.getByText('⚠ No se pudo consultar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Otorgar|Revocar/ })).not.toBeInTheDocument()
  })

  it('registra la billetera y muestra los errores del servidor', async () => {
    let intentos = 0
    backend([carlos], {
      'PUT /api/billeteras/3': () =>
        ++intentos === 1
          ? respuesta(400, {
              mensaje: 'Revise',
              campos: { direccion: 'La dirección tiene un error de tipeo (EIP-55).' },
            })
          : respuesta(200, { ...carlos, billetera: DIRECTOR, firmante: false }),
    })
    render(<PaginaBilletera />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Registrar la billetera de cmendoza' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Billetera del director' })
    const campo = within(ventana).getByLabelText('Dirección de la billetera')

    fireEvent.change(campo, { target: { value: '0x123' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Guardar billetera' }))
    expect(within(ventana).getByRole('alert')).toHaveTextContent('40 caracteres hexadecimales')

    fireEvent.change(campo, { target: { value: DIRECTOR } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Guardar billetera' }))
    expect(await within(ventana).findByRole('alert')).toHaveTextContent('EIP-55')

    fireEvent.click(within(ventana).getByRole('button', { name: 'Guardar billetera' }))
    expect(await screen.findByText(DIRECTOR)).toBeInTheDocument()
    expect(screen.getByText('Sin rol de firmante')).toBeInTheDocument()
  })

  it('otorga el rol: conecta, verifica que sea administradora, firma y el servidor lo verifica', async () => {
    vi.mocked(billetera.conectar).mockResolvedValue(ADMIN)
    vi.mocked(billetera.esAdministradorDelContrato).mockResolvedValue(true)
    vi.mocked(billetera.cambiarRolDeFirmante).mockImplementation(async (_r, _b, _o, alEnviar) => {
      alEnviar?.()
      return TX
    })
    const fetch = backend([{ ...carlos, billetera: DIRECTOR, firmante: false }], {
      'POST /api/billeteras/3/firmante': () =>
        respuesta(200, { ...carlos, billetera: DIRECTOR, firmante: true }),
    })
    render(<PaginaBilletera />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Otorgar el rol de firmante a cmendoza' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Otorgar rol de firmante' })

    fireEvent.click(within(ventana).getByRole('button', { name: 'Conectar billetera y continuar' }))
    expect(await within(ventana).findByText(ADMIN)).toBeInTheDocument()
    expect(within(ventana).getByText('Sin costo')).toBeInTheDocument()
    expect(billetera.cambiarRolDeFirmante).not.toHaveBeenCalled()

    fireEvent.click(within(ventana).getByRole('button', { name: 'Confirmar en la billetera' }))
    expect(await within(ventana).findByText(/Rol de firmante otorgado/)).toBeInTheDocument()
    expect(billetera.cambiarRolDeFirmante).toHaveBeenCalledWith(
      red,
      DIRECTOR,
      true,
      expect.any(Function),
    )
    const envio = fetch.mock.calls.find(([r]) => r === '/api/billeteras/3/firmante')
    expect(JSON.parse(envio?.[1]?.body as string)).toEqual({ transaccion: TX })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Listo' }))
    expect(await screen.findByText('✓ Firmante activo')).toBeInTheDocument()
  })

  it('si la billetera conectada no administra el contrato no envía nada', async () => {
    vi.mocked(billetera.conectar).mockResolvedValue(DIRECTOR)
    vi.mocked(billetera.esAdministradorDelContrato).mockResolvedValue(false)
    backend([{ ...carlos, billetera: DIRECTOR, firmante: false }])
    render(<PaginaBilletera />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Otorgar el rol de firmante a cmendoza' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Conectar billetera y continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no es administradora del contrato')
    expect(billetera.cambiarRolDeFirmante).not.toHaveBeenCalled()
  })

  it('si se cancela en la billetera lo indica y no llama al servidor', async () => {
    vi.mocked(billetera.conectar).mockResolvedValue(ADMIN)
    vi.mocked(billetera.esAdministradorDelContrato).mockResolvedValue(true)
    vi.mocked(billetera.cambiarRolDeFirmante).mockRejectedValue(
      new billetera.ErrorBilletera('Operación cancelada en la billetera. No se cambió nada.'),
    )
    const fetch = backend([{ ...carlos, billetera: DIRECTOR, firmante: true }])
    render(<PaginaBilletera />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Revocar el rol de firmante de cmendoza' }),
    )
    const ventana = screen.getByRole('dialog', { name: '¿Revocar el rol de firmante?' })
    expect(
      within(ventana).getByText(/Los documentos firmados antes siguen siendo válidos/),
    ).toBeInTheDocument()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Conectar billetera y continuar' }))
    fireEvent.click(
      await within(ventana).findByRole('button', { name: 'Confirmar en la billetera' }),
    )
    expect(await within(ventana).findByRole('alert')).toHaveTextContent('Operación cancelada')
    await waitFor(() =>
      expect(fetch.mock.calls.some(([r]) => String(r).endsWith('/firmante'))).toBe(false),
    )
  })
})
