// Sin caracteres que se confunden al dictarlos o leerlos: 0/O, 1/l/I.
const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITOS = '23456789'

/** HU04: contraseña temporal aleatoria de 12 caracteres, con letras y al menos dos dígitos. */
export function generarContrasenaTemporal(): string {
  const azar = new Uint32Array(12)
  crypto.getRandomValues(azar)
  return Array.from(azar, (n, i) => {
    const conjunto = i === 4 || i === 9 ? DIGITOS : LETRAS + DIGITOS
    return conjunto[n % conjunto.length]
  }).join('')
}
