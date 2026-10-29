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

export const listarCuentas = () => solicitar<Cuenta[]>('/api/usuarios')

export const listarRoles = () => solicitar<Rol[]>('/api/roles')

export const crearCuenta = (datos: NuevaCuenta) =>
  solicitar<Cuenta>('/api/usuarios', { method: 'POST', body: JSON.stringify(datos) })
