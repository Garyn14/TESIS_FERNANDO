/** Resultado de la verificación (HU21): nunca trae el DNI, el CID ni el código del documento. */
export interface Verificacion {
  /** VENCIDO (DRA-62): auténtico, pero su vigencia terminó; no se muestra el documento. */
  resultado: 'VALIDO' | 'ANULADO' | 'VENCIDO' | 'NO_VALIDO'
  mensaje: string
  tipo: string | null
  titular: string | null
  fechaEmision: string | null
  anuladoEn: string | null
  versionCorregida: boolean
  /** DRA-62: hasta qué fecha (inclusive) es válido, AAAA-MM-DD; null si no vence. */
  venceEn?: string | null
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * DRA-62: una fecha de calendario (AAAA-MM-DD) como la imprime el PDF: "11 de noviembre de 2027".
 * No pasa por Date, para que la zona horaria no la mueva un día.
 */
export function fechaDeCalendario(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${anio}`
}

/** La verificación no se pudo completar (blockchain o IPFS sin respuesta). */
export class VerificacionNoDisponible extends Error {}

const NO_DISPONIBLE =
  'No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.'

const ruta = (token: string) => `/api/verificacion/${encodeURIComponent(token)}`

/**
 * Consultas en curso: si la misma verificación se pide otra vez antes de responder (por ejemplo,
 * React en modo estricto monta dos veces), se reutiliza. Así cada visita cuenta una sola vez para
 * el límite de 10 consultas por minuto (HU20).
 */
const enCurso = new Map<string, Promise<Verificacion>>()

function unaVez(url: string): Promise<Verificacion> {
  const pendiente = enCurso.get(url)
  if (pendiente) return pendiente
  const consulta = consultar(url).finally(() => enCurso.delete(url))
  enCurso.set(url, consulta)
  return consulta
}

/** HU19: verificación con el token del código QR. */
export const verificar = (token: string) => unaVez(ruta(token))

/** HU20 (RF40): verificación con el código impreso; nunca trae el documento. */
export const verificarCodigo = (codigo: string) =>
  unaVez(`/api/verificacion/codigo/${encodeURIComponent(codigo)}`)

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
