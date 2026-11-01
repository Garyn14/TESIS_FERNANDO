import type { Beneficiario, Campo, SolicitudDocumento } from './api'

/**
 * Errores por campo, con las mismas claves que el servidor: los de la plantilla como
 * datos.<campo> y los de cada fila de beneficiarios como beneficiarios[i].<campo>.
 */
export type Errores = Record<string, string>

/** Formato provisional del expediente, hasta que el PO confirme el de Mesa de Partes. */
const EXPEDIENTE = /^EXP-\d{4}-\d{6}$/
const NOMBRE = /^\p{L}[\p{L} '-]{1,99}$/u

/** Quita los espacios de los extremos y deja uno solo entre palabras, como el servidor. */
export const limpiar = (valor: string) => valor.trim().replace(/\s+/g, ' ')

function validarNombre(valor: string, clave: string, vacio: string, errores: Errores) {
  if (!valor) errores[clave] = vacio
  else if (!NOMBRE.test(valor))
    errores[clave] = 'Use solo letras, espacios, apóstrofo o guion (de 2 a 100 caracteres).'
}

function validarDni(valor: string, clave: string, errores: Errores) {
  if (!valor) errores[clave] = 'Ingrese el DNI.'
  else if (!/^\d{8}$/.test(valor)) errores[clave] = 'El DNI debe tener 8 dígitos.'
}

/** Campos de la plantilla del tipo (HU08, HU09). */
export function validarDatos(datos: Record<string, string>, campos: Campo[]): Errores {
  const errores: Errores = {}
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  for (const campo of campos) {
    const valor = datos[campo.nombre] ?? ''
    const clave = `datos.${campo.nombre}`
    if (campo.tipo === 'TEXTO') {
      if (!valor) errores[clave] = 'Complete este campo.'
      else if (valor.length < 2 || valor.length > campo.maximo)
        errores[clave] = `Use de 2 a ${campo.maximo} caracteres.`
    } else if (campo.tipo === 'NUMERO') {
      if (!valor) errores[clave] = 'Complete este campo.'
      else if (!/^\d{1,9}$/.test(valor) || +valor < 1 || +valor > campo.maximo)
        errores[clave] = `Ingrese un número entero de 1 a ${campo.maximo}.`
    } else if (campo.tipo === 'OPCION') {
      if (!campo.opciones.includes(valor)) errores[clave] = 'Seleccione una opción.'
    } else if (!valor) errores[clave] = 'Ingrese la fecha.'
    else if (valor > hoy) errores[clave] = 'La fecha no puede ser posterior a hoy.'
  }
  const { fechaInicio, fechaFin } = datos
  if (
    fechaInicio &&
    fechaFin &&
    !errores['datos.fechaInicio'] &&
    !errores['datos.fechaFin'] &&
    fechaFin < fechaInicio
  )
    errores['datos.fechaFin'] = 'La fecha de fin no puede ser anterior a la de inicio.'
  return errores
}

/** Validación previa en el navegador (RF12). El servidor vuelve a validar todo. */
export function validarSolicitud(solicitud: SolicitudDocumento, campos: Campo[]): Errores {
  const errores: Errores = {}
  if (!solicitud.numeroExpediente) errores.numeroExpediente = 'Ingrese el número de expediente.'
  else if (!EXPEDIENTE.test(solicitud.numeroExpediente))
    errores.numeroExpediente = 'Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817.'
  validarNombre(solicitud.nombres, 'nombres', 'Ingrese los nombres.', errores)
  validarNombre(solicitud.apellidos, 'apellidos', 'Ingrese los apellidos.', errores)
  validarDni(solicitud.dni, 'dni', errores)
  return { ...errores, ...validarDatos(solicitud.datos, campos) }
}

/** HU09 (RF15): cada fila de la relación; un DNI repetido se señala en las dos filas. */
export function validarBeneficiarios(filas: Beneficiario[]): Errores {
  const errores: Errores = {}
  const primeraFila = new Map<string, number>()
  filas.forEach((fila, i) => {
    const prefijo = `beneficiarios[${i}].`
    validarNombre(fila.nombres, `${prefijo}nombres`, 'Ingrese los nombres.', errores)
    validarNombre(fila.apellidos, `${prefijo}apellidos`, 'Ingrese los apellidos.', errores)
    validarDni(fila.dni, `${prefijo}dni`, errores)
    if (errores[`${prefijo}dni`]) return
    const anterior = primeraFila.get(fila.dni)
    if (anterior === undefined) primeraFila.set(fila.dni, i)
    else {
      errores[`${prefijo}dni`] = `El DNI se repite en la fila ${anterior + 1}.`
      errores[`beneficiarios[${anterior}].dni`] ??= `El DNI se repite en la fila ${i + 1}.`
    }
  })
  return errores
}
