/**
 * Fechas en día/mes/año (observación del PO en la revisión del Sprint 2). El campo muestra
 * dd/mm/aaaa sin depender del idioma del navegador; el formulario y el servidor trabajan con la
 * fecha ISO (aaaa-mm-dd). Mientras la fecha está incompleta o no existe, se guarda tal como se
 * escribió, y la validación la señala.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export const esIso = (valor: string) => ISO.test(valor)

/** aaaa-mm-dd → dd/mm/aaaa; cualquier otro valor se muestra tal cual. */
export function mostrar(valor: string): string {
  const partes = ISO.exec(valor)
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor
}

/**
 * Lo que escribe la persona → valor del formulario. Solo se toman los dígitos y se ponen las
 * barras: "02012025" y "02/01/2025" dan "2025-01-02". Si la fecha no existe (31/02/2026) o está
 * incompleta, devuelve el texto con barras.
 */
export function leer(escrito: string): string {
  const digitos = escrito.replace(/\D/g, '').slice(0, 8)
  const conBarras = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)]
    .filter(Boolean)
    .join('/')
  if (digitos.length < 8) return conBarras
  const [dia, mes, anio] = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)]
  const fecha = new Date(Date.UTC(+anio, +mes - 1, +dia))
  const existe =
    fecha.getUTCFullYear() === +anio &&
    fecha.getUTCMonth() === +mes - 1 &&
    fecha.getUTCDate() === +dia
  return existe ? `${anio}-${mes}-${dia}` : conBarras
}
