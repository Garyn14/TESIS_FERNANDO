import { solicitar } from '../api/cliente'

/** Billetera registrada del Director y si el contrato le reconoce el rol de firmante (HU11). */
export interface EstadoBilletera {
  billetera: string | null
  firmante: boolean | null
  aviso: string | null
}

/** Lo que la billetera registra en el contrato por cada documento (HU17). */
export interface Preparado {
  codigo: string
  hash: string
  cid: string
  dniHmac: string
  /** HU30: el original que se anula en la misma transacción, si es una reemisión. */
  reemplaza?: string | null
}

export interface NoFirmado {
  codigo: string
  motivo: string
}

export interface Preparacion {
  preparados: Preparado[]
  noPreparados: NoFirmado[]
}

export interface Confirmacion {
  transaccion: string
  bloque: number
  firmados: { codigo: string; fechaEmision: string }[]
  noAplicados: NoFirmado[]
}

export interface Cancelacion {
  devueltos: string[]
  noDevueltos: NoFirmado[]
}

const enviar = <T>(ruta: string, cuerpo: unknown) =>
  solicitar<T>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) })

export const estadoBilletera = () => solicitar<EstadoBilletera>('/api/firma/billetera')

/** HU17: pasa los documentos a Procesando firma y guarda su PDF final en IPFS. */
export const preparar = (codigos: string[], lotes: string[]) =>
  enviar<Preparacion>('/api/firma/preparacion', { codigos, lotes })

/** El servidor lee la transacción en la blockchain y pasa sus documentos a Firmado. */
export const confirmar = (transaccion: string) =>
  enviar<Confirmacion>('/api/firma/confirmacion', { transaccion })

/** La firma no se completó: los documentos vuelven a Pendiente con el motivo. */
export const cancelar = (codigos: string[], motivo: string) =>
  enviar<Cancelacion>('/api/firma/cancelacion', { codigos, motivo })
