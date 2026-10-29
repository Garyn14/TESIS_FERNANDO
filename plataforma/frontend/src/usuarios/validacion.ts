import type { NuevaCuenta } from './api'

const PATRON_USUARIO = /^[a-z][a-z0-9._]{3,29}$/

export type Errores = Partial<Record<keyof NuevaCuenta, string>>

/** Mismas reglas que el backend (HU01), para avisar antes de enviar. */
export function validarCuenta(datos: NuevaCuenta): Errores {
  const errores: Errores = {}
  if (!datos.nombreUsuario) errores.nombreUsuario = 'Ingrese el nombre de usuario.'
  else if (!PATRON_USUARIO.test(datos.nombreUsuario))
    errores.nombreUsuario =
      'Use de 4 a 30 caracteres: letras sin tildes, números, punto o guion bajo, empezando con una letra.'
  if (!datos.nombreCompleto) errores.nombreCompleto = 'Ingrese el nombre completo.'
  else if (datos.nombreCompleto.length < 3 || datos.nombreCompleto.length > 150)
    errores.nombreCompleto = 'El nombre completo debe tener de 3 a 150 caracteres.'
  if (!datos.rol) errores.rol = 'Seleccione un rol.'
  if (!datos.contrasenaTemporal) errores.contrasenaTemporal = 'Ingrese la contraseña temporal.'
  else if (datos.contrasenaTemporal.length < 8 || datos.contrasenaTemporal.length > 20)
    errores.contrasenaTemporal = 'La contraseña debe tener de 8 a 20 caracteres.'
  return errores
}
