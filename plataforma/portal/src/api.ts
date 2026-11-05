/** Resultado de la verificación (HU21): nunca trae el DNI, el CID ni el código del documento. */
export interface Verificacion {
  resultado: 'VALIDO' | 'ANULADO' | 'NO_VALIDO'
  mensaje: string
  tipo: string | null
  titular: string | null
  fechaEmision: string | null
  anuladoEn: string | null
  versionCorregida: boolean
}

/** La verificación no se pudo completar (blockchain o IPFS sin respuesta). */
export class VerificacionNoDisponible extends Error {}

const NO_DISPONIBLE =
  'No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.'

const ruta = (token: string) => `/api/verificacion/${encodeURIComponent(token)}`

/** HU19: verificación con el token del código QR. */
export const verificar = (token: string) => consultar(ruta(token))

/** HU20 (RF40): verificación con el código impreso; nunca trae el documento. */
export const verificarCodigo = (codigo: string) =>
  consultar(`/api/verificacion/codigo/${encodeURIComponent(codigo)}`)

/**
 * HU20: el código tal como se escribe, con minúsculas, espacios o sin guiones, en el formato
 * DRA-AAAA-XXXXXX, sin caracteres que se confunden (RNF04). Null si no tiene el formato.
 */
export function normalizarCodigo(escrito: string): string | null {
  const limpio = escrito.trim().toUpperCase().replace(/[\s-]/g, '')
  const encontrado = /^DRA(\d{4})([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})$/.exec(limpio)
  return encontrado ? `DRA-${encontrado[1]}-${encontrado[2]}` : null
}

async function consultar(url: string): Promise<Verificacion> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new VerificacionNoDisponible(NO_DISPONIBLE)
  }
  const cuerpo = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new VerificacionNoDisponible(cuerpo?.mensaje ?? NO_DISPONIBLE)
  return cuerpo as Verificacion
}

/** HU19: el PDF verificado, solo disponible si el documento es válido. */
export const urlDelDocumento = (token: string) => `${ruta(token)}/documento`

const FECHA = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
})

/** Fecha con el mes en letras, en hora de Lima: "4 de noviembre de 2026". */
export const fechaLarga = (iso: string) => FECHA.format(new Date(iso))
