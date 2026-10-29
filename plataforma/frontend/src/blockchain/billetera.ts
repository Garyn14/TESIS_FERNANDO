/**
 * Billetera del navegador (MetaMask u otra compatible con EIP-1193), HU06. Las transacciones se
 * firman aquí: el servidor nunca recibe claves privadas (RNF05). ethers se carga solo al usarla.
 */
import type { Red } from '../billeteras/api'

interface ProveedorEip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: ProveedorEip1193
  }
}

export class ErrorBilletera extends Error {}

const ABI = [
  'function otorgarFirmante(address cuenta)',
  'function revocarFirmante(address cuenta)',
  'function esAdministrador(address cuenta) view returns (bool)',
  'function esFirmante(address cuenta) view returns (bool)',
]

/** Traduce los errores de la billetera a lenguaje cotidiano (RNF07). */
function traducir(e: unknown): ErrorBilletera {
  if (e instanceof ErrorBilletera) return e
  const error = e as { code?: number | string; info?: { error?: { code?: number } } }
  if (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    error?.info?.error?.code === 4001
  )
    return new ErrorBilletera('Operación cancelada en la billetera. No se cambió nada.')
  return new ErrorBilletera(
    'La billetera no pudo completar la operación. Revise su conexión e intente nuevamente.',
  )
}

function proveedor(): ProveedorEip1193 {
  if (!window.ethereum)
    throw new ErrorBilletera(
      'No se encontró una billetera en este navegador. Instale MetaMask (Chrome, Firefox, Edge o Brave).',
    )
  return window.ethereum
}

/** Pide acceso a la billetera y se asegura de que esté en la red de la plataforma. */
export async function conectar(red: Red): Promise<string> {
  const eth = proveedor()
  try {
    const [cuenta] = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
    const actual = (await eth.request({ method: 'eth_chainId' })) as string
    if (actual.toLowerCase() !== red.chainIdHex.toLowerCase()) {
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: red.chainIdHex }],
        })
      } catch (e) {
        // 4902: la billetera no conoce la red; se propone agregarla.
        if ((e as { code?: number }).code !== 4902) throw e
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: red.chainIdHex,
              chainName: red.nombre,
              rpcUrls: [red.rpcUrl],
              nativeCurrency: { name: 'Sin costo', symbol: 'DRA', decimals: 18 },
            },
          ],
        })
      }
    }
    const { getAddress } = await import('ethers')
    return getAddress(cuenta)
  } catch (e) {
    throw traducir(e)
  }
}

async function contrato(red: Red) {
  if (!red.contrato) throw new ErrorBilletera('La plataforma aún no tiene configurado el contrato.')
  const { BrowserProvider, Contract } = await import('ethers')
  const firmante = await new BrowserProvider(proveedor()).getSigner()
  return new Contract(red.contrato, ABI, firmante)
}

export async function esAdministradorDelContrato(red: Red, cuenta: string): Promise<boolean> {
  try {
    return await (await contrato(red)).esAdministrador(cuenta)
  } catch (e) {
    throw traducir(e)
  }
}

/**
 * Envía otorgarFirmante o revocarFirmante y espera su confirmación. Devuelve el identificador de
 * la transacción, que el servidor verifica en la blockchain. La red no cobra gas (RNF11).
 */
export async function cambiarRolDeFirmante(
  red: Red,
  billeteraDirector: string,
  otorgar: boolean,
  alEnviar?: () => void,
): Promise<string> {
  try {
    const c = await contrato(red)
    const tx = await (otorgar ? c.otorgarFirmante : c.revocarFirmante)(billeteraDirector, {
      type: 0,
      gasPrice: 0n,
    })
    alEnviar?.()
    const recibo = await tx.wait()
    if (!recibo || recibo.status !== 1)
      throw new ErrorBilletera('La blockchain rechazó la operación. No se cambió nada.')
    return tx.hash as string
  } catch (e) {
    throw traducir(e)
  }
}
