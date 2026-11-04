import type { DocumentoAFirmar } from '../blockchain/billetera'
import { ErrorBilletera } from '../blockchain/billetera'
import type { Cancelacion, Confirmacion, NoFirmado, Preparacion } from './api'

/** Máximo de documentos por transacción del contrato (HU11). */
export const MAXIMO_POR_TRANSACCION = 50

/** Divide la selección en tandas de hasta 50 documentos, una por transacción. */
export function enTandas<T>(lista: T[], tamano = MAXIMO_POR_TRANSACCION): T[][] {
  const tandas: T[][] = []
  for (let i = 0; i < lista.length; i += tamano) tandas.push(lista.slice(i, i + tamano))
  return tandas
}

export type Paso =
  | { tipo: 'preparando' }
  | { tipo: 'registrando'; tanda: number; tandas: number }
  | { tipo: 'confirmando'; tanda: number; tandas: number }

export interface Dependencias {
  preparar: () => Promise<Preparacion>
  registrar: (documentos: DocumentoAFirmar[], alEnviar: () => void) => Promise<string>
  confirmar: (transaccion: string) => Promise<Confirmacion>
  cancelar: (codigos: string[], motivo: string) => Promise<Cancelacion>
}

export interface Resultado {
  firmados: string[]
  /** No se firmaron y volvieron a Pendiente (o no llegaron a prepararse). */
  noFirmados: NoFirmado[]
  /** Quedaron en Procesando firma sin confirmar: se corrigen al sincronizar (HU18). */
  sinConfirmar: NoFirmado[]
  transacciones: string[]
}

const SIN_CONFIRMAR =
  'La firma se envió, pero no se pudo confirmar. Quedó en proceso y se confirmará al sincronizar.'

/**
 * HU11: prepara los documentos (HU17), los registra en tandas de hasta 50 y confirma cada
 * transacción. Si una tanda falla, sus documentos vuelven a Pendiente y las demás siguen.
 */
export async function firmar(deps: Dependencias, alPaso: (p: Paso) => void): Promise<Resultado> {
  alPaso({ tipo: 'preparando' })
  const preparacion = await deps.preparar()
  const resultado: Resultado = {
    firmados: [],
    noFirmados: [...preparacion.noPreparados],
    sinConfirmar: [],
    transacciones: [],
  }
  const tandas = enTandas(preparacion.preparados)
  for (const [i, tanda] of tandas.entries()) {
    const posicion = { tanda: i + 1, tandas: tandas.length }
    alPaso({ tipo: 'registrando', ...posicion })
    let transaccion: string
    try {
      transaccion = await deps.registrar(tanda, () => alPaso({ tipo: 'registrando', ...posicion }))
    } catch (e) {
      const motivo =
        e instanceof ErrorBilletera && e.cancelada
          ? 'Firma cancelada en la billetera'
          : 'La blockchain no registró la transacción'
      const codigos = tanda.map((d) => d.codigo)
      try {
        const cancelacion = await deps.cancelar(codigos, motivo)
        resultado.noFirmados.push(
          ...cancelacion.devueltos.map((codigo) => ({ codigo, motivo: motivo + '.' })),
        )
        resultado.sinConfirmar.push(...cancelacion.noDevueltos)
      } catch {
        resultado.sinConfirmar.push(...codigos.map((codigo) => ({ codigo, motivo: SIN_CONFIRMAR })))
      }
      continue
    }
    resultado.transacciones.push(transaccion)
    alPaso({ tipo: 'confirmando', ...posicion })
    try {
      const confirmacion = await deps.confirmar(transaccion)
      resultado.firmados.push(...confirmacion.firmados.map((f) => f.codigo))
      resultado.sinConfirmar.push(...confirmacion.noAplicados)
    } catch {
      resultado.sinConfirmar.push(
        ...tanda.map((d) => ({ codigo: d.codigo, motivo: SIN_CONFIRMAR })),
      )
    }
  }
  return resultado
}
