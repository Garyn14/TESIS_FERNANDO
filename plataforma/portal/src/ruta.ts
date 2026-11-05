/** La ruta del QR es /verificar/{token} (HU16, HU19). */
export function tokenDeLaRuta(ruta: string): string | null {
  const encontrado = /^\/verificar\/([^/]+)\/?$/.exec(ruta)
  return encontrado ? decodeURIComponent(encontrado[1]) : null
}
