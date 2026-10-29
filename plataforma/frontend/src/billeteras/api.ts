import { solicitar } from '../api/cliente'

export interface CuentaConBilletera {
  id: number
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  rolNombre: string
  activo: boolean
  billetera: string | null
  /** Leído de la blockchain; null si no hay billetera o la blockchain no respondió. */
  firmante: boolean | null
}

export interface Billeteras {
  blockchainDisponible: boolean
  aviso: string | null
  cuentas: CuentaConBilletera[]
}

export interface Red {
  chainId: number
  chainIdHex: string
  nombre: string
  rpcUrl: string
  contrato: string | null
  firmanteRol: string
}

export const listarBilleteras = () => solicitar<Billeteras>('/api/billeteras')

export const obtenerRed = () => solicitar<Red>('/api/blockchain/red')

export const registrarBilletera = (idCuenta: number, direccion: string) =>
  solicitar<CuentaConBilletera>(`/api/billeteras/${idCuenta}`, {
    method: 'PUT',
    body: JSON.stringify({ direccion }),
  })

export const confirmarCambioDeRol = (idCuenta: number, transaccion: string) =>
  solicitar<CuentaConBilletera>(`/api/billeteras/${idCuenta}/firmante`, {
    method: 'POST',
    body: JSON.stringify({ transaccion }),
  })
