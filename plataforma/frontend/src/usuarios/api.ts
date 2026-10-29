import { solicitar } from '../api/cliente'

export interface Cuenta {
  id: number
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  rolNombre: string
  activo: boolean
  debeCambiarContrasena: boolean
  creadoEn: string
}

export interface Rol {
  codigo: string
  nombre: string
  descripcion: string
}

export interface NuevaCuenta {
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  contrasenaTemporal: string
}

export type EdicionCuenta = Pick<NuevaCuenta, 'nombreCompleto' | 'rol'>

export const listarCuentas = () => solicitar<Cuenta[]>('/api/usuarios')

export const listarRoles = () => solicitar<Rol[]>('/api/roles')

export const crearCuenta = (datos: NuevaCuenta) =>
  solicitar<Cuenta>('/api/usuarios', { method: 'POST', body: JSON.stringify(datos) })

export const editarCuenta = (id: number, datos: EdicionCuenta) =>
  solicitar<Cuenta>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) })

export const desactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/desactivar`, { method: 'POST' })

export const reactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/reactivar`, { method: 'POST' })
