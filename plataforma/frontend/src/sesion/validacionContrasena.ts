export type Campo = 'contrasenaActual' | 'contrasenaNueva' | 'confirmacion'
export type Errores = Partial<Record<Campo, string>>

/** Mismas reglas que el backend (HU04, RNF02), más la confirmación. */
export function validarCambio(actual: string, nueva: string, confirmacion: string): Errores {
  const errores: Errores = {}
  if (!actual) errores.contrasenaActual = 'Ingrese su contraseña actual.'
  if (!nueva) errores.contrasenaNueva = 'Ingrese la contraseña nueva.'
  else if (nueva.length < 8 || nueva.length > 20)
    errores.contrasenaNueva = 'La contraseña debe tener de 8 a 20 caracteres.'
  else if (nueva === actual)
    errores.contrasenaNueva = 'La contraseña nueva debe ser distinta de la actual.'
  if (nueva && confirmacion !== nueva) errores.confirmacion = 'Las contraseñas no coinciden.'
  return errores
}
