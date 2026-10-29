import { solicitar } from '../api/cliente'

export interface Cuenta {
  id: number
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  rolNombre: string
  /** Código y nombre del área (HU05), o null. */
  area: string | null
  areaNombre: string | null
  activo: boolean
  debeCambiarContrasena: boolean
  /** Hasta cuándo está bloqueada por intentos fallidos (HU03), o null. */
  bloqueadaHasta: string | null
  creadoEn: string
}

export interface Rol {
  codigo: string
  nombre: string
  descripcion: string
}

export interface TipoDocumento {
  codigo: string
  nombre: string
}

export interface Area {
  codigo: string
  nombre: string
  tipos: TipoDocumento[]
}

/** Rol que exige área (HU05, RF05). */
export const AREA_ENCARGADA = 'AREA_ENCARGADA'

export interface NuevaCuenta {
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  /** Código del área; solo para el rol Área encargada. */
  area: string
  contrasenaTemporal: string
}

export type EdicionCuenta = Pick<NuevaCuenta, 'nombreCompleto' | 'rol' | 'area'>

export const listarCuentas = () => solicitar<Cuenta[]>('/api/usuarios')

export const listarRoles = () => solicitar<Rol[]>('/api/roles')

export const listarAreas = () => solicitar<Area[]>('/api/areas')

/** Tipos de documento que la sesión puede registrar: los de su área si es Área encargada (RF05). */
export const tiposPermitidos = () => solicitar<TipoDocumento[]>('/api/tipos-documento')

/** Solo el Área encargada lleva área; para los demás roles se envía null. */
const conArea = <T extends { rol: string; area: string }>(datos: T) => ({
  ...datos,
  area: datos.rol === AREA_ENCARGADA && datos.area ? datos.area : null,
})

export const crearCuenta = (datos: NuevaCuenta) =>
  solicitar<Cuenta>('/api/usuarios', { method: 'POST', body: JSON.stringify(conArea(datos)) })

export const editarCuenta = (id: number, datos: EdicionCuenta) =>
  solicitar<Cuenta>(`/api/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(conArea(datos)),
  })

export const desactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/desactivar`, { method: 'POST' })

export const reactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/reactivar`, { method: 'POST' })

export const restablecerContrasena = (id: number, contrasenaTemporal: string) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/restablecer-contrasena`, {
    method: 'POST',
    body: JSON.stringify({ contrasenaTemporal }),
  })
