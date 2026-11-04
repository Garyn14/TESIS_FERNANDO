import { obtenerRed, type Red } from '../billeteras/api'
import { conectar, ErrorBilletera } from '../blockchain/billetera'
import { estadoBilletera } from './api'

export const corta = (direccion: string) => `${direccion.slice(0, 6)}…${direccion.slice(-4)}`

/**
 * HU11, HU29: antes de firmar o anular se verifica que la billetera conectada sea la registrada
 * para el Director (HU06), que esté en la red de la plataforma y que el contrato le reconozca el rol
 * de firmante. Devuelve la red y la cuenta conectada.
 */
export async function verificarBilletera(): Promise<{ red: Red; cuenta: string }> {
  const [red, registrada] = await Promise.all([obtenerRed(), estadoBilletera()])
  if (!registrada.billetera || registrada.firmante !== true)
    throw new ErrorBilletera(registrada.aviso ?? 'Su billetera no puede firmar en este momento.')
  const cuenta = await conectar(red)
  if (cuenta.toLowerCase() !== registrada.billetera.toLowerCase())
    throw new ErrorBilletera(
      `La billetera conectada (${corta(cuenta)}) no es la registrada para su cuenta (${corta(registrada.billetera)}). Cambie de cuenta en su billetera e intente nuevamente.`,
    )
  return { red, cuenta }
}
