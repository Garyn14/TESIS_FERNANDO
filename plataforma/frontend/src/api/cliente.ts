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

export async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(opciones.headers)
  cabeceras.set('Accept', 'application/json')
  if (opciones.body) cabeceras.set('Content-Type', 'application/json')
  const csrf = tokenCsrf()
  if (csrf) cabeceras.set('X-XSRF-TOKEN', decodeURIComponent(csrf))

  let respuesta: Response
  try {
    respuesta = await fetch(ruta, { ...opciones, headers: cabeceras, credentials: 'include' })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Intente nuevamente.')
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null)
    throw new ErrorApi(
      respuesta.status,
      cuerpo?.mensaje ?? MENSAJES_POR_ESTADO[respuesta.status] ?? 'Ocurrió un error inesperado.',
      cuerpo?.campos ?? {},
    )
  }
  return (await respuesta.json()) as T
}
