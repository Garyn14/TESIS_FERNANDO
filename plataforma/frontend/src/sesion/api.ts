import { solicitar } from '../api/cliente'

export interface Sesion {
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  rolNombre: string
  permisos: string[]
  debeCambiarContrasena: boolean
}

/** Sesión actual. Sin sesión rechaza con ErrorApi 401 y el motivo. */
export const obtenerSesion = () => solicitar<Sesion>('/api/sesion', { sinAvisoDeSesion: true })

export const iniciarSesion = (nombreUsuario: string, contrasena: string) =>
  solicitar<Sesion>('/api/sesion', {
    method: 'POST',
    body: JSON.stringify({ nombreUsuario, contrasena }),
    sinAvisoDeSesion: true,
  })

export const cerrarSesion = () =>
  solicitar<void>('/api/sesion', { method: 'DELETE', sinAvisoDeSesion: true })

/** HU04: cambia la contraseña propia. Devuelve la sesión actualizada. */
export const cambiarContrasena = (contrasenaActual: string, contrasenaNueva: string) =>
  solicitar<Sesion>('/api/sesion/contrasena', {
    method: 'PUT',
    body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
  })
