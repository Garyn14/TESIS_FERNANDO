import { afterEach, describe, expect, it, vi } from 'vitest'
import { conectar, ErrorBilletera } from './billetera'

const red = {
  chainId: 20260,
  chainIdHex: '0x4f24',
  nombre: 'Plataforma DRA Satipo',
  rpcUrl: 'http://localhost:8545',
  contrato: '0x3FEf5c0221a4caB41D49F1A0610a4205c48e8A40',
  firmanteRol: '0x4647',
}
const CUENTA = '0x11027e00665c052211fea67178ffe0274f735544'

/** Billetera EIP-1193 simulada; registra los métodos que se le piden. */
function billetera(red_actual: string, conocerRed = true) {
  const pedidos: string[] = []
  window.ethereum = {
    request: vi.fn(async ({ method }: { method: string }) => {
      pedidos.push(method)
      if (method === 'eth_requestAccounts') return [CUENTA]
      if (method === 'eth_chainId') return red_actual
      if (method === 'wallet_switchEthereumChain' && !conocerRed)
        throw Object.assign(new Error('desconocida'), { code: 4902 })
      return null
    }),
  }
  return pedidos
}

afterEach(() => {
  delete window.ethereum
})

describe('billetera del navegador (HU06)', () => {
  it('sin billetera instalada indica cómo instalarla', async () => {
    await expect(conectar(red)).rejects.toThrow(ErrorBilletera)
    await expect(conectar(red)).rejects.toThrow(/Instale MetaMask/)
  })

  it('devuelve la cuenta con suma de verificación si ya está en la red', async () => {
    const pedidos = billetera('0x4f24')
    expect(await conectar(red)).toBe('0x11027E00665C052211fea67178FFE0274f735544')
    expect(pedidos).not.toContain('wallet_switchEthereumChain')
  })

  it('cambia a la red de la plataforma y la agrega si la billetera no la conoce', async () => {
    const pedidos = billetera('0x1', false)
    await conectar(red)
    expect(pedidos).toEqual([
      'eth_requestAccounts',
      'eth_chainId',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
    ])
  })

  it('si la persona rechaza la conexión lo dice en lenguaje cotidiano', async () => {
    window.ethereum = {
      request: vi.fn(async () => {
        throw Object.assign(new Error('User rejected'), { code: 4001 })
      }),
    }
    await expect(conectar(red)).rejects.toThrow('Operación cancelada en la billetera.')
  })
})
