/** La ruta del QR es /verificar/{token} (HU16, HU19). */
export function tokenDeLaRuta(ruta: string): string | null {
  const encontrado = /^\/verificar\/([^/]+)\/?$/.exec(ruta)
  return encontrado ? decodeURIComponent(encontrado[1]) : null
}

/** DRA-70: la guía "¿Cómo verificar un documento?". */
export const RUTA_COMO_VERIFICAR = '/como-verificar'

export function esComoVerificar(ruta: string): boolean {
  return /^\/como-verificar\/?$/.test(ruta)
}
