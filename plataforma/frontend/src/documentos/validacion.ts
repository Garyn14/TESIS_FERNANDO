import type { Campo, SolicitudDocumento } from './api'

/** Errores por campo, con las mismas claves que el servidor (los de la plantilla, datos.<campo>). */
export type Errores = Record<string, string>

/** Formato provisional del expediente, hasta que el PO confirme el de Mesa de Partes. */
const EXPEDIENTE = /^EXP-\d{4}-\d{6}$/
const NOMBRE = /^\p{L}[\p{L} '-]{1,99}$/u

/** Quita los espacios de los extremos y deja uno solo entre palabras, como el servidor. */
export const limpiar = (valor: string) => valor.trim().replace(/\s+/g, ' ')

/** Validación previa en el navegador (RF12). El servidor vuelve a validar todo. */
export function validarSolicitud(solicitud: SolicitudDocumento, campos: Campo[]): Errores {
  const errores: Errores = {}
  if (!solicitud.numeroExpediente) errores.numeroExpediente = 'Ingrese el número de expediente.'
  else if (!EXPEDIENTE.test(solicitud.numeroExpediente))
    errores.numeroExpediente = 'Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817.'
  for (const [campo, vacio] of [
    ['nombres', 'Ingrese los nombres.'],
    ['apellidos', 'Ingrese los apellidos.'],
  ] as const) {
    if (!solicitud[campo]) errores[campo] = vacio
    else if (!NOMBRE.test(solicitud[campo]))
      errores[campo] = 'Use solo letras, espacios, apóstrofo o guion (de 2 a 100 caracteres).'
  }
  if (!solicitud.dni) errores.dni = 'Ingrese el DNI.'
  else if (!/^\d{8}$/.test(solicitud.dni)) errores.dni = 'El DNI debe tener 8 dígitos.'

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  for (const campo of campos) {
    const valor = solicitud.datos[campo.nombre] ?? ''
    const clave = `datos.${campo.nombre}`
    if (campo.tipo === 'TEXTO') {
      if (!valor) errores[clave] = 'Complete este campo.'
      else if (valor.length < 2 || valor.length > 100) errores[clave] = 'Use de 2 a 100 caracteres.'
    } else if (campo.tipo === 'OPCION') {
      if (!campo.opciones.includes(valor)) errores[clave] = 'Seleccione una opción.'
    } else if (!valor) errores[clave] = 'Ingrese la fecha.'
    else if (valor > hoy) errores[clave] = 'La fecha no puede ser posterior a hoy.'
  }
  const { fechaInicio, fechaFin } = solicitud.datos
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
