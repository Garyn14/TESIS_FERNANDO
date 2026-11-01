/** Error de la API con el formato del backend: un mensaje general y el mensaje de cada campo. */
export class ErrorApi extends Error {
  readonly estado: number
  readonly campos: Record<string, string>

  constructor(estado: number, mensaje: string, campos: Record<string, string> = {}) {
    super(mensaje)
    this.estado = estado
    this.campos = campos
  }
}

type OyenteSesion = (mensaje: string) => void
const oyentes = new Set<OyenteSesion>()

/**
 * HU03: avisa cuando el servidor responde 401 a una solicitud con sesión (expiró por inactividad o
 * la cuenta fue desactivada), para volver al inicio de sesión con el motivo.
 */
export function alTerminarSesion(oyente: OyenteSesion): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  401: 'Su sesión no está activa. Inicie sesión nuevamente.',
  403: 'No tiene permiso para realizar esta acción.',
}

/** Token CSRF de Spring Security, si el backend lo envió en la cookie XSRF-TOKEN. */
function tokenCsrf(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
}

interface Opciones extends RequestInit {
  /** No avisar a los oyentes de sesión ante un 401 (inicio de sesión y consulta de la sesión). */
  sinAvisoDeSesion?: boolean
}

export async function solicitar<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { sinAvisoDeSesion, ...init } = opciones
  const cabeceras = new Headers(init.headers)
  cabeceras.set('Accept', 'application/json')
  // Un FormData (archivo) lleva su propio tipo, con el separador de partes.
  if (typeof init.body === 'string') cabeceras.set('Content-Type', 'application/json')
  const csrf = tokenCsrf()
  if (csrf) cabeceras.set('X-XSRF-TOKEN', decodeURIComponent(csrf))

  let respuesta: Response
  try {
    respuesta = await fetch(ruta, { ...init, headers: cabeceras, credentials: 'include' })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Intente nuevamente.')
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null)
    const error = new ErrorApi(
      respuesta.status,
      cuerpo?.mensaje ?? MENSAJES_POR_ESTADO[respuesta.status] ?? 'Ocurrió un error inesperado.',
      cuerpo?.campos ?? {},
    )
    if (respuesta.status === 401 && !sinAvisoDeSesion) oyentes.forEach((o) => o(error.message))
    throw error
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
